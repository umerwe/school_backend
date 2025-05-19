import { Admin } from "../models/admin.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { Report } from '../models/report.model.js'
import { Student } from "../models/student.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Voucher } from "../models/voucher.model.js";
import { Parent } from "../models/parent.model.js";
import { Marks } from "../models/marks.model.js";
import { Class } from "../models/class.model.js";
import { Attendance } from "../models/attendance.model.js";
import { Announcement } from "../models/announcements.js";
import { ActivityLog } from "../models/activityLog.model.js";
import { Subject } from '../models/subject.model.js';
import mongoose from "mongoose";

export const updateAdminById = asyncHandler(async (req, res) => {
  const { id } = req.params; // Get admin ID from URL
  const updateData = req.body; // Get all update data from request body
  const logoFile = req.file; // Get uploaded logo file if exists

  // Check if at least one field is provided for update
  if (!Object.keys(updateData).length && !logoFile) {
    throw new ApiError(400, 'Please provide at least one field to update');
  }

  // Check if admin exists
  const admin = await Admin.findById(id);
  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  // Upload new logo if provided
  if (logoFile) {
    const logo = await uploadOnCloudinary(logoFile.path);
    if (!logo) {
      throw new ApiError(500, "Failed to upload logo");
    }
    updateData.logo = logo.url;
  }
  // Check if the email is valid
  if (updateData.email) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(updateData.email)) {
      throw new ApiError(400, 'Invalid email format');
    }
  }

  // Check for duplicate email or school name (only if they're being updated)
  if (updateData.email || updateData.SchoolOrCollegeName) {
    const filter = { _id: { $ne: id } }; // Exclude current admin

    if (updateData.email) filter.email = updateData.email;
    if (updateData.SchoolOrCollegeName) filter.SchoolOrCollegeName = updateData.SchoolOrCollegeName;

    const existingAdmin = await Admin.findOne(filter);
    if (existingAdmin) {
      throw new ApiError(400,
        existingAdmin.email === updateData.email
          ? 'Email already in use'
          : 'School/College name already taken'
      );
    }
  }


  // Update admin record
  const updatedAdmin = await Admin.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  // Remove sensitive fields before sending response
  const adminData = updatedAdmin.toObject();
  delete adminData.password;
  delete adminData.refreshToken;

  res.status(200).json(
    new ApiResponse(200, adminData, 'Admin updated successfully')
  );
});

export const getAdminReports = asyncHandler(async (req, res) => {
  try {
    const instituteId = req.user._id;

    // Fetch reports for the admin's institute
    const reports = await Report.find({ instituteId })
      .populate('student', 'name -_id')
      .populate('parent', 'name -_id')
      .sort({ createdAt: -1 })
      .lean();

    // Format reports for frontend
    const formattedReports = reports.map((report) => ({
      _id: report._id,
      studentName: report.student?.name || 'N/A',
      parentName: report.parent?.name || 'N/A',
      reportType: report.reportType,
      description: report.description,
      status: report.status,
      comments: report.comments,
      createdAt: report.createdAt,
    }));

    return res.status(200).json(
      new ApiResponse(200, formattedReports, 'Reports retrieved successfully')
    );
  } catch (error) {
    console.log(error)
  }
});

export const getAdminNumber = asyncHandler(async (req, res) => {
  const _id = req.user._id;
  const admin = await Admin.findOne({ _id });

  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { number: admin.number },
        'Number fetched successfully'));
});

export const resetAdminNumber = asyncHandler(async (req, res) => {
  const _id = req.user._id;

  const admin = await Admin.findOneAndUpdate(
    { _id },
    { number: 0 },
    { new: true }
  );

  if (!admin) {
    throw new ApiError(404, 'Admin not found');
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { number: admin.number },
        'Number reset successfully'));
});

const adminDashboardController = {
  getDashboardSummary: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const summary = {
      students: [],
      teachers: [],
      classes: [],
      attendance: [],
      parents: [],
      vouchers: [],
      activityLog: [],
      announcements: [],
      adminNumber: null,
      averageMarks: null,
      subjects: [],
      reports: []
    };

    // Parallel fetching of all data
    const [
      students,
      teachers,
      classes,
      attendanceRecords,
      parents,
      vouchers,
      activities,
      announcements,
      admin,
      allMarks,
      subjects,
      reports
    ] = await Promise.all([
      // Students
      Student.find({ instituteId })
        .populate('guardian', 'name email phoneNumber')
        .sort({ studentClass: 1, section: 1, name: 1 })
        .lean(),
      
      // Teachers
      Teacher.find({ instituteId })
        .populate('classTeacherOf', 'classTitle section')
        .sort({ name: 1 })
        .lean(),
      
      // Classes
      Class.aggregate([
        { $match: { instituteId: new mongoose.Types.ObjectId(instituteId) } },
        { $lookup: { from: 'teachers', localField: 'classTeacher', foreignField: '_id', as: 'classTeacher' } },
        { $set: { classTeacher: { $arrayElemAt: ['$classTeacher', 0] } } },
        { $lookup: { from: 'students', localField: 'students', foreignField: '_id', as: 'students' } },
        { $lookup: { from: 'subjects', localField: 'subjects', foreignField: '_id', as: 'subjects' } },
        { $addFields: { totalStudents: { $size: '$students' }, totalSubjects: { $size: '$subjects' } } },
        { $unwind: { path: '$subjects', preserveNullAndEmptyArrays: true } },
        { $lookup: { from: 'teachers', localField: 'subjects.subjectTeacher', foreignField: '_id', as: 'subjectTeacherInfo' } },
        { $set: { 'subjects.subjectTeacher': { $arrayElemAt: ['$subjectTeacherInfo', 0] } } },
        { $group: { _id: '$_id', classTitle: { $first: '$classTitle' }, section: { $first: '$section' }, classTeacher: { $first: '$classTeacher' }, students: { $first: '$students' }, subjects: { $push: '$subjects' }, totalStudents: { $first: '$totalStudents' }, totalSubjects: { $first: '$totalSubjects' }, createdAt: { $first: '$createdAt' }, updatedAt: { $first: '$updatedAt' } } },
        { $sort: { classTitle: 1, section: 1 } },
        { $project: { classTitle: 1, section: 1, classTeacher: { name: '$classTeacher.name', teacherId: '$classTeacher.teacherId' }, students: { $map: { input: '$students', as: 'student', in: { name: '$$student.name', rollNumber: '$$student.rollNumber' } } }, subjects: { $map: { input: '$subjects', as: 'subject', in: { subjectName: '$$subject.subjectName', subjectTeacher: { name: '$$subject.subjectTeacher.name', teacherId: '$$subject.subjectTeacher.teacherId' } } } }, totalStudents: 1, totalSubjects: 1, createdAt: 1, updatedAt: 1 } }
      ]),
      
      // Attendance
      Attendance.find({ instituteId })
        .populate('students.studentId', 'name rollNumber')
        .populate('classId')
        .sort({ date: -1 })
        .lean(),
      
      // Parents
      Parent.find({ instituteId })
        .populate('instituteId', 'instituteName email')
        .populate('childrens', 'name -_id')
        .select('-password -__v')
        .lean(),
      
      // Vouchers
      Voucher.find({ instituteId })
        .populate('student', 'name voucherId rollNumber studentClass section')
        .sort({ createdAt: -1 })
        .lean(),
      
      // Activity Log
      ActivityLog.find({ instituteId })
        .sort({ date: -1 })
        .limit(10)
        .select('action date details')
        .lean(),
      
      // Announcements
      Announcement.find({ instituteId })
        .sort({ createdAt: -1 })
        .select('title message createdAt audience')
        .lean(),
      
      // Admin number
      Admin.findOne({ _id: instituteId }, 'number -_id').lean(),
      
      // Marks for average calculation
      Marks.find({ instituteId })
        .select('obtainedMarks totalMarks')
        .lean(),
      
      // Subjects
      Subject.find({ instituteId })
        .populate("subjectTeacher", "name teacherId")
        .sort({ classTitle: 1, section: 1, subjectName: 1 })
        .lean(),
      
      // Reports
      Report.find({ instituteId })
        .populate('student', 'name -_id')
        .populate('parent', 'name -_id')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // Process students
    summary.students = students.map(student => {
      const { _id, name, rollNumber, email, role, logo, studentClass, section, admissionYear, dateOfBirth, address, emergencyContact, bloodGroup, nationality, guardian, createdAt, updatedAt, __v } = student;
      return { _id, name, rollNumber, email, role, logo, studentClass, section, admissionYear, dateOfBirth, address, emergencyContact, bloodGroup, nationality, guardian, createdAt, updatedAt, __v };
    });

    // Process teachers
    summary.teachers = teachers.map(teacher => {
      const { _id, name, teacherId, classTeacherOf, logo, email, phoneNumber, role, department, dateOfBirth, address, qualifications, emergencyContact, bloodGroup, nationality, createdAt, updatedAt, __v } = teacher;
      return { _id, name, teacherId, classTeacherOf, logo, email, phoneNumber, role, department, dateOfBirth, address, qualifications, emergencyContact, bloodGroup, nationality, createdAt, updatedAt, __v };
    });

    // Process classes
    summary.classes = classes;

    // Process attendance
    summary.attendance = attendanceRecords.map(record => ({
      _id: record._id,
      date: record.date,
      students: record.students.map(s => ({
        studentId: s?.studentId?._id,
        name: s?.studentId?.name,
        rollNumber: s?.studentId?.rollNumber,
        status: s?.status
      })),
      class: record.classId ? `${record.classId.classTitle}-${record.classId.section}` : 'N/A'
    }));

    // Process parents
    summary.parents = parents;

    // Process vouchers
    summary.vouchers = vouchers;

    // Process activity log
    summary.activityLog = activities.map(activity => ({
      action: activity.action,
      date: new Date(activity.date).toLocaleDateString(),
      details: activity.details || ''
    }));

    // Process announcements
    summary.announcements = announcements;

    // Process admin number
    summary.adminNumber = admin ? { number: admin.number } : null;

    // Process average marks
    if (allMarks.length > 0) {
      const totalPercentage = allMarks.reduce((sum, mark) => {
        return sum + (mark.obtainedMarks / mark.totalMarks) * 100;
      }, 0);
      summary.averageMarks = { 
        average: (totalPercentage / allMarks.length).toFixed(1), 
        totalRecords: allMarks.length 
      };
    } else {
      summary.averageMarks = { average: null };
    }

    // Process subjects
    summary.subjects = subjects.map(subject => {
      const { _id, subjectName, classTitle, section, subjectTeacher, createdAt, updatedAt, __v } = subject;
      return { _id, subjectName, classTitle, section, subjectTeacher, createdAt, updatedAt, __v };
    });

    // Process reports
    summary.reports = reports.map(report => ({
      _id: report._id,
      studentName: report.student?.name || 'N/A',
      parentName: report.parent?.name || 'N/A',
      reportType: report.reportType,
      description: report.description,
      status: report.status,
      comments: report.comments || [],
      createdAt: report.createdAt,
    }));

    return res.status(200).json(
      new ApiResponse(200, summary, 'Dashboard summary fetched successfully')
    );
  }),

  // Other controller methods can remain the same as before
  getAllStudents: asyncHandler(async (req, res) => {
    // ... existing implementation
  }),

  getAllTeachers: asyncHandler(async (req, res) => {
    // ... existing implementation
  }),

  // ... other methods
};

export default adminDashboardController;