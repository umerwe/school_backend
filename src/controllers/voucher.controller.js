import { Student } from "../models/student.model.js";
import { Voucher } from "../models/voucher.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ActivityLog } from "../models/activityLog.model.js";

export const generateVoucher = asyncHandler(async (req, res) => {
    const instituteId = req.user?._id;
    const { studentClass, section, amount, month, year, dueDate } = req.body;

    // Validate required fields
    if (!studentClass || !section || !amount || !month || !year || !dueDate) {
        throw new ApiError(400, 'All fields are required including year');
    }

    // Validate month format (optional)
    const validMonths = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    if (!validMonths.includes(month)) {
        throw new ApiError(400, 'Invalid month provided');
    }

    // Find students in the specified class and section
    const students = await Student.find({
        studentClass,
        section: section.trim().toUpperCase(),
        instituteId
    });

    if (students.length === 0) {
        throw new ApiError(404, 'No students found for the given class and section');
    }

    // Check for existing vouchers for the same month and year
    const existingVouchers = await Voucher.find({
        student: { $in: students.map(s => s._id) },
        month,
        year,
        instituteId
    });

    if (existingVouchers.length > 0) {
        const existingStudents = existingVouchers.map(v => v.student.toString());
        throw new ApiError(409, `Fee vouchers already exist for ${month} ${year} for ${existingVouchers.length} student(s)`);
    }

    // Generate unique 7-digit voucherId
    const generateVoucherId = () => {
        return Math.floor(1000000 + Math.random() * 9000000).toString();
    };

    // Prepare vouchers for insertion
    const vouchers = await Promise.all(
        students.map(async (student) => {
            let uniqueVoucherId;
            let isUnique = false;

            // Ensure voucherId is unique
            while (!isUnique) {
                uniqueVoucherId = generateVoucherId();
                const existing = await Voucher.findOne({ voucherId: uniqueVoucherId });
                if (!existing) isUnique = true;
            }

            return {
                student: student._id,
                amount,
                month,
                year,
                dueDate,
                instituteId,
                voucherId: uniqueVoucherId,
            };
        })
    );

    try {
        // Insert all vouchers in a single operation
        await Voucher.insertMany(vouchers);

        await ActivityLog.create({
            instituteId,
            action: `Fee Voucher Created for Class: ${studentClass}-${section}`,
        });

        return res.status(201).json(
            new ApiResponse(201, vouchers, 'Vouchers generated successfully')
        );

    } catch (error) {
        if (error.code === 11000) {
            if (error.keyPattern?.voucherId) {
                throw new ApiError(409, 'Duplicate voucherId detected. Please try again.');
            }
            if (error.keyPattern?.month && error.keyPattern?.year && error.keyPattern?.student) {
                throw new ApiError(409, 'Duplicate month/year voucher for student detected');
            }
        }
        throw new ApiError(500, 'Failed to generate vouchers: ' + error.message);
    }
});

export const getStudentVouchers = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const instituteId = req.user.instituteId;

    const vouchers = await Voucher.find({ student: studentId, instituteId });

    if (!vouchers || vouchers.length === 0) {
        throw new ApiError(404, 'No vouchers found for this student');
    }

    res
        .status(200)
        .json(
            new ApiResponse(
                200,
                vouchers,
                'Vouchers fetched successfully'));
});

export const getAllVouchers = asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const vouchers = await Voucher.find({ instituteId })
        .populate('student', 'name rollNumber studentClass section')
        .sort({ createdAt: -1 });

    if (!vouchers || vouchers.length === 0) {
        throw new ApiError(404, "No vouchers found");
    }

    res
        .status(200)
        .json(
            new ApiResponse(
                200,
                vouchers,
                "All vouchers fetched successfully"
            )
        );
});




