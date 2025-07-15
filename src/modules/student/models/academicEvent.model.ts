import { Schema, model, Document } from 'mongoose';

export const EVENT_CATEGORIES = ['Term', 'Exam', 'Holiday', 'Other'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

export interface IAcademicEvent {
    academicYear: Schema.Types.ObjectId;
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    allDay: boolean;
    category: EventCategory;
    colorCode?: string;             // Optional for frontend calendar
    createdBy: Schema.Types.ObjectId;
}

export interface IAcademicEventDoc extends IAcademicEvent, Document { }

const AcademicEventSchema = new Schema<IAcademicEventDoc>(
    {
        academicYear: {
            type: Schema.Types.ObjectId,
            ref: 'AcademicYear',
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ''
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: Date, // no default
        allDay: {
            type: Boolean,
            default: true
        },
        category: {
            type: String,
            enum: EVENT_CATEGORIES,
            default: 'Other'
        },
        colorCode: {
            type: String,
            default: null
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    { timestamps: true }
);

// Indexes
AcademicEventSchema.index({ academicYear: 1, startDate: 1 });
AcademicEventSchema.index({ academicYear: 1, category: 1, startDate: 1 });

// Virtuals
AcademicEventSchema.virtual('duration').get(function () {
    if (!this.endDate) return 1;
    const diff = (this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24);
    return Math.ceil(diff) + 1;
});

export const AcademicEventModel = model<IAcademicEventDoc>('AcademicEvent', AcademicEventSchema);
