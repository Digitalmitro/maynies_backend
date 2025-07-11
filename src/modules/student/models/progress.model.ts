// models/Progress.model.ts
import {
    Schema,
    model,
    Document,
    Types,
    Model,
} from 'mongoose';

// 1. Define allowed letter‐grades
export const GRADE_ENUM = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'] as const;
export type LetterGrade = typeof GRADE_ENUM[number];

// 2. Interface for Progress document
export interface IProgress {
    studentId: Types.ObjectId;        // ref to User
    courseId: Types.ObjectId;         // ref to Course

    grade: LetterGrade;               // final letter grade
    gpa: number;                      // 0.0 – 4.0 scale
    progressPercent: number;          // 0 – 100

    credits: number;                  // course credit hours
    completedAt?: Date;               // when course was completed (optional)
}

export interface IProgressDoc extends IProgress, Document {
    // instance method to recalc grade/gpa/progress if needed
    recalcFrom(percent: number): void;
}

// 3. Schema definition
const ProgressSchema = new Schema<IProgressDoc>(
    {
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        courseId: {
            type: Schema.Types.ObjectId,
            ref: 'Course',
            required: true,
            index: true
        },

        grade: {
            type: String,
            required: true,
            enum: GRADE_ENUM
        },
        gpa: {
            type: Number,
            required: true,
            min: 0,
            max: 4.0
        },
        progressPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },

        credits: {
            type: Number,
            required: true,
            min: 0
        },
        completedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,     // createdAt & updatedAt
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

// 4. Composite unique index: ek student-ek course ka ek hi record
ProgressSchema.index(
    { studentId: 1, courseId: 1 },
    { unique: true }
);

// 5. Virtual: isCompleted flag
ProgressSchema.virtual('isCompleted').get(function (this: IProgressDoc) {
    return this.progressPercent === 100 || !!this.completedAt;
});

// 6. Instance method: recalc based on a new progress percent
ProgressSchema.methods.recalcFrom = function (this: IProgressDoc, pct: number) {
    // example logic: map percent -> gpa & grade
    this.progressPercent = Math.min(100, Math.max(0, pct));
    this.gpa = +(this.progressPercent / 25).toFixed(2); // 0–4 scale
    // simple letter mapping
    if (this.gpa >= 3.8) this.grade = 'A';
    else if (this.gpa >= 3.5) this.grade = 'A-';
    else if (this.gpa >= 3.0) this.grade = 'B+';
    else if (this.gpa >= 2.5) this.grade = 'B';
    else if (this.gpa >= 2.0) this.grade = 'C+';
    else if (this.gpa >= 1.5) this.grade = 'C';
    else if (this.gpa >= 1.0) this.grade = 'D';
    else this.grade = 'F';

    if (this.progressPercent === 100 && !this.completedAt) {
        this.completedAt = new Date();
    }
};

// 7. Pre‐save hook: ensure consistency
ProgressSchema.pre<IProgressDoc>('save', function (next) {
    // completedAt must only exist if progressPercent is 100
    if (this.completedAt && this.progressPercent < 100) {
        this.completedAt = undefined;
    }
    next();
});

// 8. Static helper (optional): fetch overview for a student
interface ProgressModelType extends Model<IProgressDoc> {
    fetchOverview(studentId: string | Types.ObjectId): Promise<IProgressDoc[]>;
}
ProgressSchema.statics.fetchOverview = function (studentId) {
    return this.find({ studentId })
        .populate('courseId', 'title credits')
        .sort({ updatedAt: -1 })
        .lean();
};

// 9. Export
export const ProgressModel = model<IProgressDoc, ProgressModelType>(
    'Progress',
    ProgressSchema
);
