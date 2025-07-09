import { Schema, model, Document, Types } from 'mongoose';
import { AssignmentScore, CourseGrade, Progress } from '../types';




interface ProgressDocument extends Progress, Document { }


const AssignmentScoreSchema = new Schema<AssignmentScore>(
    {
        assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
        score: { type: Number, required: true },
        maxScore: { type: Number, required: true },
        submittedAt: { type: Date, required: true, default: Date.now },
    },
    { _id: false }
);

const CourseGradeSchema = new Schema<CourseGrade>(
    {
        score: { type: Number, required: true },
        grade: { type: String, required: true },
        computedAt: { type: Date, required: true, default: Date.now },
    },
    { _id: false }
);

const ProgressSchema = new Schema<ProgressDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        courseId: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
        assignments: { type: [AssignmentScoreSchema], default: [] },
        courseGrade: { type: CourseGradeSchema, required: false },
        credits: { type: Number, required: true },
        completedAt: { type: Date, required: false },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

export const ProgressModel = model<ProgressDocument>('Progress', ProgressSchema);


export interface GpaSnapshot {

    userId: Types.ObjectId;
    term: string;
    gpa: number;
    computedAt?: Date;
    created_at?: Date;
}



interface GpaSnapshotDocument extends GpaSnapshot, Document { }

const GpaSnapshotSchema = new Schema<GpaSnapshotDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        term: { type: String, required: true },
        gpa: { type: Number, required: true },
        computedAt: { type: Date, required: true, default: Date.now },
    },
    {
        timestamps: { createdAt: 'created_at' }
    }
);

export const GpaSnapshotModel = model<GpaSnapshotDocument>('GpaSnapshot', GpaSnapshotSchema);
