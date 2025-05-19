import { Class } from "../models/class.model.js";
import { Student } from "../models/student.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Marks } from "../models/marks.model.js";
import { Attendance } from "../models/attendance.model.js";
import { ActivityLog } from "../models/activityLog.model.js";
import { Announcement } from "../models/announcements.js";
import { Voucher } from "../models/voucher.model.js";

export const updateStudentById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const logoFile = req.file;
    const instituteId = req.user._id;

    // Trim and normalize strings
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.section) updateData.section = updateData.section.trim().toUpperCase();
    if (updateData.guardianName) updateData.guardianName = updateData.guardianName.trim().toLowerCase();
    if (updateData.studentClass) updateData.studentClass = updateData.studentClass.trim();

    // Convert types
    if (updateData.admissionYear) updateData.admissionYear = Number(updateData.admissionYear);
    if (updateData.studentClass) updateData.studentClass = updateData.studentClass;
    if (updateData.dateOfBirth) updateData.dateOfBirth = new Date(updateData.dateOfBirth);

    // If no data provided
    if (!Object.keys(updateData).length && !logoFile) {
        throw new ApiError(400, 'Please provide at least one field to update');
    }

    // Fetch student and validate institute match
    const student = await Student.findOne({ _id: id, instituteId });
    if (!student) {
        throw new ApiError(404, 'Student not found');
    }

    // Upload logo if provided
    if (logoFile) {
        const logo = await uploadOnCloudinary(logoFile.path);
        if (!logo) {
            throw new ApiError(500, "Failed to upload logo");
        }
        updateData.logo = logo.url;
    }

    // Validate email formats
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (updateData.email && !emailRegex.test(updateData.email)) {
        throw new ApiError(400, 'Invalid student email format');
    }
    if (updateData.guardianEmail && !emailRegex.test(updateData.guardianEmail)) {
        throw new ApiError(400, 'Invalid guardian email format');
    }

    // Check for duplicates
    if (updateData.email || updateData.rollNumber) {
        const filter = { _id: { $ne: id }, instituteId };
        if (updateData.email) filter.email = updateData.email;
        if (updateData.rollNumber) filter.rollNumber = updateData.rollNumber;

        const existingStudent = await Student.findOne(filter);
        if (existingStudent) {
            throw new ApiError(400,
                existingStudent.email === updateData.email
                    ? 'Email already in use'
                    : 'Roll number already taken'
            );
        }
    }

    // Validate and update class info
    let newClass;
    if (updateData.studentClass || updateData.section) {
        newClass = await Class.findOne({
            classTitle: updateData.studentClass || student.studentClass,
            section: updateData.section || student.section,
            instituteId
        });

        if (!newClass) {
            throw new ApiError(404, 'Target class or section not found');
        }

        // Change class association if updated
        if (updateData.studentClass && updateData.section &&
            (student.studentClass !== updateData.studentClass || student.section !== updateData.section)) {
            await Class.updateOne(
                { classTitle: student.studentClass, section: student.section, instituteId },
                { $pull: { students: student._id } }
            );

            if (!newClass.students.includes(student._id)) {
                newClass.students.push(student._id);
                await newClass.save({ validateBeforeSave: false });
            }

            updateData.studentClass = newClass.classTitle;
            updateData.section = newClass.section;
        }
    }

    // Check if guardian exists if guardian info is updated
    if (updateData.guardianName && updateData.guardianEmail) {
        const parent = await Parent.findOne({
            name: updateData.guardianName,
            email: updateData.guardianEmail,
            instituteId
        });

        if (!parent) {
            throw new ApiError(404, 'Parent not found. Please register the parent first.');
        }

        // Add student to parent's children list if not already
        if (!parent.childrens.includes(student._id)) {
            parent.childrens.push(student._id);
            await parent.save({ validateBeforeSave: true });
        }

        updateData.guardian = parent._id;
    }

    // Update student record
    const updatedStudent = await Student.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
    );

    // Clean response
    const studentData = updatedStudent.toObject();

    await ActivityLog.create({
        instituteId,
        action: `Updated Student: ${updateData.name}`,
    });

    delete studentData.password;
    delete studentData.refreshToken;

    return res.status(200).json(
        new ApiResponse(200, studentData, 'Student updated successfully')
    );
});

export const deleteStudentById = asyncHandler(async (req, res) => {
    const instituteId = req.user._id
    const { id } = req.params;

    const deletedStudent = await Student.findOneAndDelete(id, { _id: id, instituteId });

    if (!deletedStudent) {
        throw new ApiError(404, "Student not found");
    }
    await ActivityLog.create({
        instituteId,
        action: `Deleted Student: ${deletedStudent.name}`,
    });

    return res.status(200).json(
        new ApiResponse(200, deletedStudent, "Student deleted successfully")
    );
})

export const getStudentById = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const instituteId = req.user._id; // Get institute ID from authenticated user

    // Check if student exists and belongs to the institute
    const student = await Student.findOne({ _id: studentId, instituteId });
    if (!student) {
        throw new ApiError(404, 'Student not found');
    }

    // Remove sensitive fields before sending response
    const studentData = student.toObject();
    delete studentData.password;
    delete studentData.refreshToken;

    res.status(200).json(
        new ApiResponse(200, studentData, 'Student fetched successfully')
    );
});

export const getAllStudents = asyncHandler(async (req, res) => {
    const instituteId = req.user._id; // Get institute ID from request

    // Fetch all students belonging to this institute
    const students = await Student.find({ instituteId })
        .populate('guardian', 'name email phoneNumber')
        .sort({
            studentClass: 1,
            section: 1,
            name: 1,
        });

    // Handle no students found
    if (!students || students.length === 0) {
        throw new ApiError(404, 'No Student found');
    }

    // Sanitize and reorder each student object
    const sanitizedStudents = students.map(student => {
        const s = student.toObject();
        const {
            _id,
            name,
            rollNumber,
            email,
            role,
            logo,
            studentClass,
            section,
            admissionYear,
            dateOfBirth,
            address,
            emergencyContact,
            bloodGroup,
            nationality,
            guardian,
            createdAt,
            updatedAt,
            __v
        } = s;

        return {
            _id,
            name,
            rollNumber,
            email,
            role,
            logo,
            studentClass,
            section,
            admissionYear,
            dateOfBirth,
            address,
            emergencyContact,
            bloodGroup,
            nationality,
            guardian,
            createdAt,
            updatedAt,
            __v
        };
    });

    // Send response
    return res.status(200).json(
        new ApiResponse(200, sanitizedStudents, 'All Students fetched successfully')
    );
});

export const getStudentSubjects = asyncHandler(async (req, res) => {
    const student = req.user; // Get student data from request
    const instituteId = req.user.instituteId;

    // Find the class based on className and section
    const studentClass = await Class.findOne({
        classTitle: student.studentClass,
        section: student.section.trim().toUpperCase(),
        instituteId
    }).populate([
        {
            path: 'subjects',
            select: 'subjectName',
            populate: {
                path: 'subjectTeacher',
                select: 'name teacherId -_id',
            },
        },
    ]);

    // If class not found
    if (!studentClass) {
        throw new ApiError(404, "Class not found")
    }

    // Send back the subjects
    return res.status(200).json(
        new ApiResponse(
            200,
            studentClass,
            "Student subjects fetched successfully"
        )
    );
});

export const getStudentMarks = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const instituteId = req.user.instituteId; // Get institute ID from request

    if (!id) {
        return res.status(400).json(
            new ApiResponse(400, null, "Student ID is required")
        );
    }

    const studentMarks = await Marks.find({ student: id, instituteId })
        .populate({
            path: "student",
            select: "name rollNumber -_id"
        })
        .populate({
            path: "subjectTeacher",
            select: "name teacherId -_id"
        })
        .populate({
            path: "classTeacher",
            select: "name teacherId -_id"
        })

    if (!studentMarks || studentMarks.length === 0) {
        return res.status(404).json(
            new ApiResponse(404, [], "No marks found for this student")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, studentMarks, "Student marks fetched successfully")
    );
});

export const getStudentAttendance = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const instituteId = req.user.instituteId;

    const studentAttendance = await Attendance.find(
        {
            "students.studentId": studentId,
            instituteId
        },
        {
            classId: 1,
            teacherId: 1,
            date: 1,
            instituteId: 1,
            students: { $elemMatch: { studentId } },
            createdAt: 1,
            updatedAt: 1,
        }
    ).sort({ date: -1 });

    if (!studentAttendance) {
        throw new ApiError(404, 'Attendance not found');
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            studentAttendance,
            'Attendance fetched successfully'
        )
    );
});

export const getStudentNumber = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const instituteId = req.user.instituteId;

    const student = await Student.findOne({ _id: studentId, instituteId });
    if (!student) {
        throw new ApiError(404, 'Student not found');
    }

    res.status(200).json(new ApiResponse(200, { number: student.number }, 'Number fetched successfully'));
});

export const resetStudentNumber = asyncHandler(async (req, res) => {
    const { studentId } = req.params;
    const instituteId = req.user.instituteId;

    const student = await Student.findOneAndUpdate(
        { _id: studentId, instituteId },
        { number: 0 },
        { new: true }
    );

    if (!student) {
        throw new ApiError(404, 'Student not found');
    }

    res.status(200).json(new ApiResponse(200, { number: student.number }, 'Number reset successfully'));
});

const studentDashboardController = {
    getDashboardSummary: asyncHandler(async (req, res) => {
        const { _id: studentId, instituteId, studentClass, section } = req.user;
        const summary = {
            classDetails: null,
            subjects: [],
            attendance: [],
            marks: [],
            announcements: [],
            vouchers: [],
            studentCount: null
        };

        // Fetch student's class details and subjects
        const classData = await Class.findOne({
            classTitle: studentClass,
            section: section?.trim().toUpperCase(),
            instituteId
        })
            .populate('classTeacher', 'name teacherId -_id')
            .populate({
                path: 'subjects',
                select: 'subjectName subjectTeacher -_id',
                populate: { path: 'subjectTeacher', select: 'name teacherId -_id' }
            })
            .lean();

        if (classData) {
            summary.classDetails = {
                classTitle: classData.classTitle,
                section: classData.section,
                classTeacher: classData.classTeacher
            };
            summary.subjects = classData.subjects.map(({ subjectName, subjectTeacher }) => ({
                subjectName,
                subjectTeacher
            }));
        }

        // Fetch student's attendance
        summary.attendance = await Attendance.find(
            { "students.studentId": studentId, instituteId },
            { classId: 1, date: 1, students: { $elemMatch: { studentId } }, createdAt: 1, updatedAt: 1 }
        )
            .sort({ date: -1 })
            .lean()
            .then(records => records.map(({ _id, date, students, createdAt, updatedAt }) => ({
                _id,
                date,
                status: students[0]?.status,
                createdAt,
                updatedAt
            })));

        // Fetch student's marks
        summary.marks = await Marks.find({ student: studentId, instituteId })
            .populate('student', 'name rollNumber -_id')
            .populate('subjectTeacher', 'name teacherId -_id')
            .populate('classTeacher', 'name teacherId -_id')
            .sort({ subject: 1 })
            .lean()
            .then(marks => marks.map(({ _id, student, subject, subjectTeacher, classTeacher, classTitle, section, assessmentType, totalMarks, obtainedMarks, grade, createdAt, updatedAt }) => ({
                _id,
                student,
                subject,
                subjectTeacher,
                classTeacher,
                classTitle,
                section,
                assessmentType,
                totalMarks,
                obtainedMarks,
                grade,
                createdAt,
                updatedAt
            })));

        // Fetch announcements for students
        summary.announcements = await Announcement.find({
            instituteId,
            audience: { $in: ['students', 'all', /students/i] }
        })
            .sort({ createdAt: -1 })
            .select('title message createdAt audience')
            .lean();

        // Fetch student's contact number
        const student = await Student.findOne({ _id: studentId, instituteId }, 'number -_id').lean();
        summary.studentCount = student ? { number: student.number } : null;

        // Fetch student's vouchers
        summary.vouchers = await Voucher.find({ student: studentId, instituteId }, '_id voucherId amount dueDate status createdAt updatedAt')
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json(
            new ApiResponse(200, summary, 'Student dashboard summary fetched successfully')
        );
    })
};

export default studentDashboardController;