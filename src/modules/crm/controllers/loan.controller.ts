import { Request, Response } from "express"
import LoanRequest from "../models/loanRequest.model";
import { CreateLoanRequestInput } from "../dtos/createLoanRequest.dto";
import LoanRepayment from "../models/loanRepayment.model";


class Loan {

    // admin Methods


    async getAllLoans(req: Request, res: Response) {

        const employeeId = req?.user?.user?._id
        const loans = await LoanRequest.find().populate('employeeId');
        res.json(loans);
    }

    async loanApprove(req: Request, res: Response) {

        try {
            const loanRequest = await LoanRequest.findById(req.params.id);

            if (!loanRequest) {
                return res.status(404).json({ message: "Loan request not found" });
            }

            if (loanRequest.status !== "pending") {
                return res.status(400).json({ message: "Loan already processed" });
            }

            // Step 1: Update loan status
            loanRequest.status = "approved";
            loanRequest.approvedAt = new Date();
            await loanRequest.save();

            // Step 2: Auto-generate repayments
            const monthlyAmount = Math.floor(loanRequest.amount / loanRequest.durationMonths);
            const remainder = loanRequest.amount % loanRequest.durationMonths;

            const repayments = [];

            for (let i = 0; i < loanRequest.durationMonths; i++) {
                const dueMonth = new Date();
                dueMonth.setMonth(dueMonth.getMonth() + i);

                const amount = i === 0 ? monthlyAmount + remainder : monthlyAmount;

                repayments.push({
                    loanRequestId: loanRequest._id,
                    employeeId: loanRequest.employeeId,
                    month: dueMonth.toISOString().slice(0, 7), // e.g. "2025-08"
                    amount,
                    dueDate: new Date(dueMonth.getFullYear(), dueMonth.getMonth(), 5), // Every 5th of month
                });
            }

            await LoanRepayment.insertMany(repayments);

            return res.status(200).json({
                message: "Loan approved & repayment schedule created",
                repayments,
            });
        } catch (error) {
            console.error("Loan approval failed", error);
            res.status(500).json({ message: "Something went wrong" });
        }
    }


    // employee methods

    async getMyLoans(req: Request, res: Response) {
        try {
            const userId = req?.user?.user?._id; // assuming middleware set req.user
            const loans = await LoanRequest.find({ employeeId: userId })
                .sort({ createdAt: -1 })
                .select("-__v")
                .lean();

            res.status(200).json(loans);
        } catch (error) {
            console.error("Error fetching my loans:", error);
            res.status(500).json({ message: "Failed to fetch your loans" });
        }
    };

    async getLoanById(req: Request, res: Response) {

        try {
            const loanId = req.params.id;
            const userId = req?.user?.user?._id;

            const loan = await LoanRequest.findById(loanId)
                .populate("repayments") // virtual populate
                .lean();

            if (!loan) {
                return res.status(404).json({ message: "Loan not found" });
            }

            // check if the loan belongs to the requesting employee
            if (loan.employeeId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "Access denied" });
            }

            res.status(200).json(loan);
        } catch (error) {
            console.error("Error fetching loan:", error);
            res.status(500).json({ message: "Failed to fetch loan" });
        }
    };


    async createLoanRequest(
        req: Request<{}, {}, CreateLoanRequestInput>,
        res: Response
    ) {
        try {
            const { amount, durationMonths, reason, notes } = req.body;

            const userId = req.user?.user?._id;

            if (!userId) {
                return res.status(401).json({ message: "Unauthorized user" });
            }

            const existing = await LoanRequest.findOne({
                employeeId: userId,
                status: "pending",
            });

            if (existing) {
                return res.status(409).json({ message: "You already have a pending loan request." });
            }

            const newLoan = await LoanRequest.create({
                employeeId: userId,
                amount,
                durationMonths,
                reason,
                notes,
                status: "pending",
            });

            return res.status(201).json({
                message: "Loan request created successfully",
                data: newLoan,
            });
        } catch (error: any) {
            console.error("Error creating loan request:", error.message);
            return res.status(500).json({ message: "Something went wrong", error: error.message });
        }
    };


    async updateLoanRequest(req: Request, res: Response) {
        try {
            const loanId = req.params.id;
            const userId = req?.user?.user?._id; // assuming user is attached by auth middleware
            const payload = req.body;

            const loan = await LoanRequest.findOne({ _id: loanId, employeeId: userId });

            if (!loan) {
                return res.status(404).json({ message: "Loan not found" });
            }

            if (["approved", "rejected"].includes(loan.status)) {
                return res.status(400).json({ message: "Loan already processed, cannot be updated" });
            }

            // Update only the fields sent in the payload
            if (payload.amount !== undefined) loan.amount = payload.amount;
            if (payload.durationMonths !== undefined) loan.durationMonths = payload.durationMonths;
            if (payload.reason !== undefined) loan.reason = payload.reason;
            if (payload.notes !== undefined) loan.notes = payload.notes;

            await loan.save();

            return res.status(200).json({
                message: "Loan request updated successfully",
                data: loan,
            });
        } catch (error) {
            console.error("Error updating loan request:", error);
            return res.status(500).json({ message: "Something went wrong" });
        }
    };

    async payRepayment(req: Request, res: Response) {
        try {
            const { id, repaymentId } = req.params;
            const userId = req?.user?.user?._id;

            const repayment = await LoanRepayment.findById(repaymentId);
            if (!repayment)
                return res.status(404).json({ message: "Repayment not found" });

            if (repayment.status === "paid") {
                return res.status(400).json({ message: "Repayment already paid" });
            }

            if (repayment.loanRequestId.toString() !== id) {
                return res.status(400).json({ message: "Loan ID mismatch" });
            }

            if (repayment.employeeId.toString() !== userId?.toString()) {
                return res.status(403).json({ message: "Not your repayment" });
            }

            const loan = await LoanRequest.findById(id);
            if (!loan)
                return res.status(404).json({ message: "Loan not found" });

            if (loan.status !== "approved") {
                return res.status(400).json({ message: "Loan is not approved yet" });
            }

            repayment.status = "paid";
            repayment.paidAt = new Date();
            repayment.paidBy = userId;

            await repayment.save();
            const isCompleted = await this.checkAndMarkLoanCompletion(id);

            return res.status(200).json({ message: "Repayment successful", repayment, loanStatus: isCompleted ? "completed" : "ongoing" });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Something went wrong" });
        }

    }

    async getRepaymentsByLoan(req: Request, res: Response) {
        try {
            const loanId = req.params.id;
            const userId = req?.user?.user?._id;

            // Step 1: Verify loan exists and belongs to employee
            const loan = await LoanRequest.findById(loanId);
            if (!loan) return res.status(404).json({ message: "Loan not found" });
            console.log(loan.employeeId.toString(), userId.toString());
            if (loan.employeeId.toString() !== userId.toString()) {
                return res.status(403).json({ message: "You are not authorized to view these repayments" });
            }

            // Step 2: Fetch repayments
            const repayments = await LoanRepayment.find({
                loanRequestId: loanId,
                employeeId: userId,
            }).sort({ dueDate: 1 });

            res.status(200).json({ repayments });
        } catch (err) {
            console.error("Error fetching repayments:", err);
            res.status(500).json({ message: "Something went wrong" });
        }
    }

    async checkAndMarkLoanCompletion(loanId: string): Promise<boolean> {
        const unpaidCount = await LoanRepayment.countDocuments({
            loanRequestId: loanId,
            status: "unpaid"
        });

        if (unpaidCount === 0) {
            await LoanRequest.findByIdAndUpdate(loanId, { status: "completed" });
            return true;
        }

        return false;
    }

    async checkLoanCompletion(req: Request, res: Response) {
        try {
            const { id: loanId } = req.params;

            const loan = await LoanRequest.findById(loanId);
            if (!loan) return res.status(404).json({ message: "Loan not found" });

            const completed = await this.checkAndMarkLoanCompletion(loanId);

            return res.status(200).json({
                loanId,
                status: completed ? "completed" : "ongoing"
            });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: "Something went wrong" });
        }
    }




}

export default new Loan();