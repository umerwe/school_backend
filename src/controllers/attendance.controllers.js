import mongoose from "mongoose";
import { Class } from "../models/class.model.js";
import { Attendance } from "../models/attendance.model.js";
import { Student } from "../models/student.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const hasClassStudents = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const { date } = req.query;
    const teacherId = req.user._id;

    if (!mongoose.isValidObjectId(classId)) {
        throw new ApiError(400, 'Invalid classId format');
    }

    // Parse and validate date
    const parsedDate = date ? new Date(date) : new Date();
    if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, 'Invalid date format');
    }

    // Verify class exists and is assigned to teacher
    const classExists = await Class.findOne({ _id: classId, classTeacher: teacherId });
    if (!classExists) {
        throw new ApiError(404, 'Class not found or not assigned to you');
    }

    // Check if class has any students
    if (!classExists.students?.length) {
        return res.status(200).json(
            new ApiResponse(200, { hasStudents: false }, 'No students in this class')
        );
    }

    // Prepare date range for attendance query
    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
        classId,
        date: { $gte: startOfDay, $lte: endOfDay }
    });

    let hasUnmarkedStudents = true;
    if (existingAttendance) {
        const markedStudentIds = existingAttendance.students.map(s => s.studentId.toString());
        const unmarkedStudents = classExists.students.filter(
            studentId => !markedStudentIds.includes(studentId.toString())
        );
        hasUnmarkedStudents = unmarkedStudents.length > 0;
    }

    return res.status(200).json(
        new ApiResponse(200, { hasStudents: hasUnmarkedStudents }, 'Checked students availability')
    );
});

export const getClassStudents = asyncHandler(async (req, res) => {
    const { classId } = req.params;
    const teacherId = req.user._id;
    const instituteId = req.user.instituteId;

    if (!mongoose.isValidObjectId(classId)) {
        throw new ApiError(400, 'Invalid classId format');
    }

    const classExists = await Class.findOne({ _id: classId, classTeacher: teacherId, instituteId })
        .populate('students', 'name rollNumber');

    if (!classExists) {
        throw new ApiError(404, 'Class not found or not assigned to you');
    }

    const students = classExists.students;

    if (!students.length) {
        return res.status(200).json(
            new ApiResponse(200, { students: [] }, 'No students found in this class')
        );
    }

    const formattedStudents = students.map(student => ({
        _id: student._id,
        name: student.name,
        rollNumber: student.rollNumber
    }));

    return res.status(200).json(
        new ApiResponse(200, { students: formattedStudents }, 'Students fetched successfully')
    );
});

export const saveAttendance = asyncHandler(async (req, res) => {
    const { classId, date, students } = req.body;
    const teacherId = req.user?._id;
    const instituteId = req.user?.instituteId;

    if (!teacherId || !mongoose.isValidObjectId(teacherId)) {
        throw new ApiError(401, 'Invalid or missing teacher ID');
    }

    if (!classId || !date || !students || !Array.isArray(students)) {
        throw new ApiError(400, 'Invalid input: classId, date, and students array are required');
    }

    if (!mongoose.isValidObjectId(classId)) {
        throw new ApiError(400, 'Invalid classId format');
    }

    const invalidStudentId = students.find(s => !mongoose.isValidObjectId(s.studentId));
    if (invalidStudentId) {
        throw new ApiError(400, 'Invalid studentId format');
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, 'Invalid date format');
    }

    const classExists = await Class.findOne({ _id: classId, classTeacher: teacherId, instituteId });
    if (!classExists) {
        throw new ApiError(404, 'Class not found or not assigned to you');
    }

    const studentIds = students.map(s => s.studentId);
    const validStudents = await Student.find({
        _id: { $in: studentIds },
        studentClass: classExists.classTitle,
        section: classExists.section,
        instituteId
    });

    if (validStudents.length !== studentIds.length) {
        throw new ApiError(400, 'One or more student IDs are invalid or do not belong to this class');
    }

    const validStatuses = ['present', 'absent'];
    const invalidStatus = students.find(s => !validStatuses.includes(s.status));
    if (invalidStatus) {
        throw new ApiError(400, 'Invalid status: must be "present" or "absent"');
    }

    const startOfDay = new Date(parsedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(parsedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAttendance = await Attendance.findOne({
        classId,
        date: { $gte: startOfDay, $lte: endOfDay },
        instituteId
    });

    if (existingAttendance) {
        throw new ApiError(400, 'Attendance already recorded for this date');
    }

    const attendance = new Attendance({
        classId,
        teacherId,
        date: parsedDate,
        students,
        instituteId
    });

    await attendance.save();

    return res.status(201).json(
        new ApiResponse(201, null, 'Attendance saved successfully')
    );
});

export const getStudentAttendanceHistory = asyncHandler(async (req, res) => {
        const { classId, date, studentId } = req.query;
    const teacherId = req.user._id;
    if (!mongoose.isValidObjectId(classId)) {
        throw new ApiError(400, 'Invalid classId format');
    }

    // Verify class belongs to teacher
    const classExists = await Class.findOne({ _id: classId, classTeacher: teacherId });
    if (!classExists) {
        throw new ApiError(404, 'Class not found or not assigned to you');
    }

    // Build base query
    const query = { classId };

    // Date filtering
    if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            throw new ApiError(400, 'Invalid date format');
        }

        const startOfDay = new Date(parsedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(parsedDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
    }

    const attendanceRecords = await Attendance.find(query)
        .populate('students.studentId', 'name rollNumber')
        .sort({ date: -1 });

    if (!attendanceRecords.length) {
        throw new ApiError(404, 'No attendance records found');
    }

    // Format result
    let formattedRecords = attendanceRecords.map(record => ({
        _id: record._id,
        date: record.date,
        students: record.students.map(s => ({
            studentId: s?.studentId?._id,
            name: s?.studentId?.name,
            rollNumber: s?.studentId?.rollNumber,
            status: s?.status
        }))
    }));

    // Optional student filter
    if (studentId) {
        if (!mongoose.isValidObjectId(studentId)) {
            throw new ApiError(400, 'Invalid studentId format');
        }

        formattedRecords = formattedRecords
            .map(record => ({
                ...record,
                students: record.students.filter(s => s.studentId.toString() === studentId)
            }))
            .filter(record => record.students.length > 0);
    }

    return res.status(200).json(
        new ApiResponse(200, { records: formattedRecords }, 'Attendance history fetched successfully')
    );
});

export const getAttendanceHistory = asyncHandler(async (req, res) => {
    const instituteId = req.user._id;

    const attendanceRecords = await Attendance.find({instituteId})
        .populate('students.studentId', 'name rollNumber')
        .sort({ date: -1 });

    if (!attendanceRecords.length) {
        throw new ApiError(404, 'No attendance records found');
    }

    // Format result
    let formattedRecords = attendanceRecords.map(record => ({
        _id: record._id,
        date: record.date,
        students: record.students.map(s => ({
            studentId: s?.studentId?._id,
            name: s?.studentId?.name,
            rollNumber: s?.studentId?.rollNumber,
            status: s?.status
        }))
    }));

    return res.status(200).json(
        new ApiResponse(200,formattedRecords, 'Attendance history fetched successfully')
    );
});