import { CreateCourseDto } from '../dtos/createCourse.dto';
import { CourseModel } from '../models/course.model';
import { CourseDetailModel } from '../models/courseDetail.model';
import { generateUniqueSlug } from '../../../shared/utils/slugify'; // optional helper
import { CourseMaterialModel } from '../models/courseMaterial.model';
import { UpdateCourseDto } from '../dtos/updateCourse.dto';
import { CourseCartModel } from '../models/courseCart.model';
import { AddToCartDto } from '../dtos/addToCart.dto';
import { Types } from 'mongoose';
import { BaseError } from '../../../shared/utils/baseError';
import { CourseEnrollmentModel } from '../models/courseEnrollment.model';


interface GetCoursesQuery {
    search?: string;
    category?: string;
    level?: string;
    language?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}



export class CourseService {

    async createCourse(input: CreateCourseDto, createdBy: string) {
        const {
            title, slug, description,
            thumbnail_url, preview_video_url,
            instructor_name, instructor_image,
            category, language, level,
            price, discount_price, is_free,
            tags, validity_days,
            materials // 👈 materials added
        } = input;

        const finalSlug = slug || generateUniqueSlug(title);

        // Step 1: Create Course
        const course = await CourseModel.create({
            title,
            slug: finalSlug,
            thumbnail_url,
            preview_video_url,
            instructor_name,
            instructor_image,
            category,
            language,
            level,
            price,
            discount_price,
            is_free,
            created_by: createdBy
        });

        // Step 2: Create CourseDetail
        await CourseDetailModel.create({
            course_id: course._id,
            description,
            tags,
            validity_days: validity_days || 365
        });

        // ✅ Step 3: Create CourseMaterials
        if (materials && Array.isArray(materials)) {
            const materialDocs = materials.map((mat) => ({
                course_id: course._id,
                title: mat.title,
                file_url: mat.file_url,
                file_type: mat.file_type,
                uploaded_by: createdBy
            }));

            await CourseMaterialModel.insertMany(materialDocs);
        }

        return course;
    }

    async getAllCourses(query: GetCoursesQuery) {
        const {
            search = '',
            category,
            level,
            language,
            page = 1,
            limit = 10,
            sortBy = 'created_at',
            sortOrder = 'desc'
        } = query;

        const filter: any = {
            is_active: true,
            is_deleted: false
        };

        if (category) filter.category = category;
        if (level) filter.level = level;
        if (language) filter.language = language;
        if (search) {
            filter.$or = [
                { title: new RegExp(search, 'i') },
                { instructor_name: new RegExp(search, 'i') },
                { category: new RegExp(search, 'i') }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [courses, total] = await Promise.all([
            CourseModel.find(filter)
                .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
                .skip(skip)
                .limit(Number(limit))
                .lean(),

            CourseModel.countDocuments(filter)
        ]);

        return {
            total,
            page: Number(page),
            limit: Number(limit),
            courses
        };
    }

    async getCourseBySlug(slug: string, userId: string) {
        const course = await CourseModel.findOne({
            slug,
            is_active: true,
            is_deleted: false
        }).lean();

        if (!course) {
            throw new Error('Course not found');
        }

        const detail = await CourseDetailModel.findOne({ course_id: course._id }).lean();
        const materials = await CourseMaterialModel.find({ course_id: course._id }).lean();
        let isEnrolled = false;

        if (userId) {
            const enrollment = await CourseEnrollmentModel.findOne({
                course_id: course._id,
                student_id: userId,
                access_granted: true
            }).lean();
            isEnrolled = Boolean(enrollment);
        }
        return {
            ...course,
            isEnrolled,
            description: detail?.description,
            tags: detail?.tags || [],
            validity_days: detail?.validity_days || 0,
            rating_avg: detail?.rating_avg || 0,
            rating_count: detail?.rating_count || 0,
            views: detail?.views || 0,
            total_enrollments: detail?.total_enrollments || 0,
            materials: materials.map(m => ({
                _id: m._id,
                title: m.title,
                file_url: m.file_url,
                file_type: m.file_type
            }))
        };
    }



    async updateCourse(courseId: string, input: UpdateCourseDto, updatedBy: string) {
        const {
            title, slug, description,
            thumbnail_url, preview_video_url,
            instructor_name, instructor_image,
            category, language, level,
            price, discount_price, is_free,
            tags, validity_days,
            materials
        } = input;

        // Step 1: Update Course base
        await CourseModel.findByIdAndUpdate(courseId, {
            ...(title && { title }),
            ...(slug && { slug }),
            ...(thumbnail_url && { thumbnail_url }),
            ...(preview_video_url && { preview_video_url }),
            ...(instructor_name && { instructor_name }),
            ...(instructor_image && { instructor_image }),
            ...(category && { category }),
            ...(language && { language }),
            ...(level && { level }),
            ...(price && { price }),
            ...(discount_price && { discount_price }),
            ...(is_free !== undefined && { is_free })
        });

        // Step 2: Update Course Detail
        await CourseDetailModel.findOneAndUpdate(
            { course_id: courseId },
            {
                ...(description && { description }),
                ...(tags && { tags }),
                ...(validity_days && { validity_days })
            }
        );

        // Step 3: Replace materials (if provided)
        if (materials && Array.isArray(materials)) {
            // Remove old
            await CourseMaterialModel.deleteMany({ course_id: courseId });

            // Insert new
            const materialDocs = materials.map((m) => ({
                course_id: courseId,
                title: m.title,
                file_url: m.file_url,
                file_type: m.file_type,
                uploaded_by: updatedBy
            }));

            await CourseMaterialModel.insertMany(materialDocs);
        }

        return await CourseModel.findById(courseId).lean();
    }

    async softDeleteCourse(courseId: string) {
        const course = await CourseModel.findById(courseId);
        if (!course) throw new Error('Course not found');

        await CourseModel.findByIdAndUpdate(courseId, {
            is_deleted: true,
            is_active: false
        });

        // Optionally log or notify
    }

    async addToCart(input: AddToCartDto, studentId: string) {
        const exists = await CourseCartModel.findOne({
            student_id: new Types.ObjectId(studentId),
            course_id: new Types.ObjectId(input.course_id)
        });

        if (exists) {
            throw new BaseError('Course is already in your cart', 400);
        }

        const item = await CourseCartModel.create({
            course_id: input.course_id,
            student_id: studentId
        });

        return item;
    }

    async getCartItems(studentId: string) {
        return CourseCartModel.find({ student_id: studentId })
            .populate('course_id')  // for full course details
            .sort({ createdAt: -1 }) // latest first
            .lean();
    }
    async removeFromCart(courseId: string, studentId: string) {
        const deleted = await CourseCartModel.findOneAndDelete({
            course_id: courseId,
            student_id: studentId
        });

        if (!deleted) {
            throw new Error("Course not found in your cart");
        }

        return deleted;
    }

}
