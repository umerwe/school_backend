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
  getAllStudents: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const students = await Student.find({ instituteId })
      .populate('guardian', 'name email phoneNumber')
      .sort({ studentClass: 1, section: 1, name: 1 });
    if (!students || students.length === 0) {
      throw new ApiError(404, 'No Student found');
    }
    const sanitizedStudents = students.map(student => {
      const { _id, name, rollNumber, email, role, logo, studentClass, section, admissionYear, dateOfBirth, address, emergencyContact, bloodGroup, nationality, guardian, createdAt, updatedAt, __v } = student.toObject();
      return { _id, name, rollNumber, email, role, logo, studentClass, section, admissionYear, dateOfBirth, address, emergencyContact, bloodGroup, nationality, guardian, createdAt, updatedAt, __v };
    });
    return res.status(200).json(new ApiResponse(200, sanitizedStudents, 'All Students fetched successfully'));
  }),

  getAllTeachers: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const teachers = await Teacher.find({ instituteId })
      .populate('classTeacherOf', 'classTitle section')
      .sort({ name: 1 });
    if (!teachers || teachers.length === 0) {
      throw new ApiError(404, 'No teachers found');
    }
    const sanitizedTeachers = teachers.map(teacher => {
      const { _id, name, teacherId, classTeacherOf, logo, email, phoneNumber, role, department, dateOfBirth, address, qualifications, emergencyContact, bloodGroup, nationality, createdAt, updatedAt, __v } = teacher.toObject();
      return { _id, name, teacherId, classTeacherOf, logo, email, phoneNumber, role, department, dateOfBirth, address, qualifications, emergencyContact, bloodGroup, nationality, createdAt, updatedAt, __v };
    });
    return res.status(200).json(new ApiResponse(200, sanitizedTeachers, 'All teachers fetched successfully'));
  }),

  getAllVouchers: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const vouchers = await Voucher.find({ instituteId })
      .populate('student', 'name rollNumber studentClass section')
      .sort({ createdAt: -1 });
    if (!vouchers || vouchers.length === 0) {
      throw new ApiError(404, 'No vouchers found');
    }
    return res.status(200).json(new ApiResponse(200, vouchers, 'All vouchers fetched successfully'));
  }),

  getAllParents: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const parents = await Parent.find({ instituteId })
      .populate('instituteId', 'instituteName email')
      .populate('childrens', 'name -_id')
      .select('-password -__v');
    return res.status(200).json(new ApiResponse(200, parents, 'All parents fetched successfully'));
  }),

  getAllClasses: asyncHandler(async (req, res) => {
    const classes = await Class.aggregate([
      { $match: { instituteId: new mongoose.Types.ObjectId(req.user._id) } },
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
    ]);
    if (!classes || classes.length === 0) {
      throw new ApiError(404, 'No Classes found');
    }
    return res.status(200).json(new ApiResponse(200, classes, 'All classes fetched successfully'));
  }),

  getAttendanceHistory: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const attendanceRecords = await Attendance.find({ instituteId })
      .populate('students.studentId', 'name rollNumber')
      .sort({ date: -1 });
    if (!attendanceRecords.length) {
      throw new ApiError(404, 'No attendance records found');
    }
    const formattedRecords = attendanceRecords.map(record => ({
      _id: record._id,
      date: record.date,
      students: record.students.map(s => ({
        studentId: s?.studentId?._id,
        name: s?.studentId?.name,
        rollNumber: s?.studentId?.rollNumber,
        status: s?.status
      }))
    }));
    return res.status(200).json(new ApiResponse(200, formattedRecords, 'Attendance history fetched successfully'));
  }),

  getAllAnnouncements: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const announcements = await Announcement.find({ instituteId })
      .sort({ createdAt: -1 })
      .select('title message createdAt audience');
    return res.status(200).json(new ApiResponse(200, announcements, 'All announcements fetched successfully'));
  }),

  getAdminNumber: asyncHandler(async (req, res) => {
    const _id = req.user._id;
    const admin = await Admin.findOne({ _id });
    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }
    return res.status(200).json(new ApiResponse(200, { number: admin.number }, 'Number fetched successfully'));
  }),

  getActivityLog: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const activities = await ActivityLog.find({ instituteId })
      .sort({ date: -1 })
      .limit(10)
      .select('action date details');
    const formattedActivities = activities.map(activity => ({
      action: activity.action,
      date: new Date(activity.date).toLocaleDateString(),
      details: activity.details || ''
    }));
    return res.status(200).json(new ApiResponse(200, formattedActivities, 'Activity log retrieved'));
  }),

  getAverageMarks: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const allMarks = await Marks.find({ instituteId })
      .select('obtainedMarks totalMarks')
      .lean();
    if (!allMarks || allMarks.length === 0) {
      return res.status(200).json(new ApiResponse(200, { average: null }, 'No marks data available'));
    }
    const totalPercentage = allMarks.reduce((sum, mark) => {
      return sum + (mark.obtainedMarks / mark.totalMarks) * 100;
    }, 0);
    const average = totalPercentage / allMarks.length;
    return res.status(200).json(new ApiResponse(200, { average: average.toFixed(1), totalRecords: allMarks.length }, 'Average marks calculated successfully'));
  }),

  getAllSubjects: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const subjects = await Subject.find({ instituteId })
      .populate("subjectTeacher", "name teacherId")
      .sort({ classTitle: 1, section: 1, subjectName: 1 });
    if (!subjects || subjects.length === 0) {
      throw new ApiError(404, 'No Subject found');
    }
    const sanitizedSubjects = subjects.map(subject => {
      const { _id, subjectName, classTitle, section, subjectTeacher, createdAt, updatedAt, __v } = subject.toObject();
      return { _id, subjectName, classTitle, section, subjectTeacher, createdAt, updatedAt, __v };
    });
    return res.status(200).json(new ApiResponse(200, sanitizedSubjects, 'All Subjects fetched successfully'));
  }),

  getAdminReports: asyncHandler(async (req, res) => {
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
      comments: report.comments || [],
      createdAt: report.createdAt,
    }));

    return res.status(200).json(
      new ApiResponse(200, formattedReports, 'Reports retrieved successfully')
    );
  }),

  getDashboardSummary: asyncHandler(async (req, res) => {
    const instituteId = req.user._id;
    const summary = {
      students: null,
      teachers: null,
      classes: null,
      attendance: null,
      parents: null,
      vouchers: null,
      activityLog: null,
      announcements: null,
      adminNumber: null,
      averageMarks: null,
      subjects: null,
      reports: null,
    };

    // Fetch students
    const students = await Student.find({ instituteId })
      .populate('guardian', 'name email phoneNumber')
      .sort({ studentClass: 1, section: 1, name: 1 });
    summary.students = students.map(student => {
      const { _id, name, rollNumber, email, role, logo, studentClass, section, admissionYear, dateOfBirth, address, emergencyContact, bloodGroup, nationality, guardian, createdAt, updatedAt, __v } = student.toObject();
      return { _id, name, rollNumber, email, role, logo, studentClass, section, admissionYear, dateOfBirth, address, emergencyContact, bloodGroup, nationality, guardian, createdAt, updatedAt, __v };
    });

    // Fetch teachers
    const teachers = await Teacher.find({ instituteId })
      .populate('classTeacherOf', 'classTitle section')
      .sort({ name: 1 });
    summary.teachers = teachers.map(teacher => {
      const { _id, name, teacherId, classTeacherOf, logo, email, phoneNumber, role, department, dateOfBirth, address, qualifications, emergencyContact, bloodGroup, nationality, createdAt, updatedAt, __v } = teacher.toObject();
      return { _id, name, teacherId, classTeacherOf, logo, email, phoneNumber, role, department, dateOfBirth, address, qualifications, emergencyContact, bloodGroup, nationality, createdAt, updatedAt, __v };
    });

    // Fetch classes
    const classes = await Class.aggregate([
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
    ]);
    summary.classes = classes;

    // Fetch attendance
     const attendanceRecords = await Attendance.find({ instituteId })
      .populate('students.studentId', 'name rollNumber')
      .populate('classId')
      .sort({ date: -1 });
    summary.attendance = attendanceRecords.map(record => ({
      _id: record._id,
      date: record.date,
      students: record.students.map(s => ({
        studentId: s?.studentId?._id,
        name: s?.studentId?.name,
        rollNumber: s?.studentId?.rollNumber,
        status: s?.status
      })),
        class : `${record.classId.classTitle}-${record.classId.section}`
    }));
    // Fetch parents
    const parents = await Parent.find({ instituteId })
      .populate('instituteId', 'instituteName email')
      .populate('childrens', 'name -_id')
      .select('-password -__v');
    summary.parents = parents;

    // Fetch vouchers
    const vouchers = await Voucher.find({ instituteId })
      .populate('student', 'name voucherId rollNumber studentClass section')
      .sort({ createdAt: -1 });
    summary.vouchers = vouchers;

    // Fetch activity log
    const activities = await ActivityLog.find({ instituteId })
      .sort({ date: -1 })
      .limit(10)
      .select('action date details');
    summary.activityLog = activities.map(activity => ({
      action: activity.action,
      date: new Date(activity.date).toLocaleDateString(),
      details: activity.details || ''
    }));

    // Fetch announcements
    const announcements = await Announcement.find({ instituteId })
      .sort({ createdAt: -1 })
      .select('title message createdAt audience');
    summary.announcements = announcements;

    // Fetch admin number
    const admin = await Admin.findOne({ _id: instituteId });
    summary.adminNumber = admin ? { number: admin.number } : null;

    // Fetch average marks
    const allMarks = await Marks.find({ instituteId })
      .select('obtainedMarks totalMarks')
      .lean();
    if (allMarks.length > 0) {
      const totalPercentage = allMarks.reduce((sum, mark) => {
        return sum + (mark.obtainedMarks / mark.totalMarks) * 100;
      }, 0);
      summary.averageMarks = { average: (totalPercentage / allMarks.length).toFixed(1), totalRecords: allMarks.length };
    } else {
      summary.averageMarks = { average: null };
    }

    // Fetch subjects
    const subjects = await Subject.find({ instituteId })
      .populate("subjectTeacher", "name teacherId")
      .sort({ classTitle: 1, section: 1, subjectName: 1 });
    summary.subjects = subjects.map(subject => {
      const { _id, subjectName, classTitle, section, subjectTeacher, createdAt, updatedAt, __v } = subject.toObject();
      return { _id, subjectName, classTitle, section, subjectTeacher, createdAt, updatedAt, __v };
    });

    // Fetch reports
    const reports = await Report.find({ instituteId })
      .populate('student', 'name -_id')
      .populate('parent', 'name -_id')
      .sort({ createdAt: -1 })
      .lean();
    summary.reports = reports.map((report) => ({
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
};

export default adminDashboardController;