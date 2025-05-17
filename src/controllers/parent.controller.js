import { Parent } from "../models/parent.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Student } from "../models/student.model.js";
import { ActivityLog } from "../models/activityLog.model.js";
import { Attendance } from "../models/attendance.model.js";
import { Voucher } from "../models/voucher.model.js";
import { Marks } from "../models/marks.model.js";
import { Report } from "../models/report.model.js";
import { Admin } from "../models/admin.model.js";
import { Class } from "../models/class.model.js";
import { Announcement } from "../models/announcements.js";

export const getAllParents = asyncHandler(async (req, res) => {
  const instituteId = req.user._id;

  const parents = await Parent.find({ instituteId })
    .populate("instituteId", "instituteName email")
    .populate("childrens", "name -_id")
    .select("-password -__v")

  return res.status(200).json(
    new ApiResponse(200, parents, "All parents fetched successfully")
  );
});

export const getParentById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id)

    const parent = await Parent.findOne({ _id: id }).populate("instituteId", "instituteName email")
      .select("-password -__v");


    if (!parent) {
      throw new ApiError(404, "Parent not found");
    }

    return res.status(200).json(
      new ApiResponse(200, parent, "Parent fetched successfully")
    );
  } catch (error) {
    console.log(error)
  }
});

export const deleteParent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instituteId = req.user._id;
  const parent = await Parent.findById(id);
  if (!parent) {
    throw new ApiError(404, "Parent not found");
  }

  // Unlink parent from any student (if applicable)
  await Student.updateMany(
    { "guardian.parentId": id },
    { $unset: { "guardian.parentId": "" } }
  );

  await parent.deleteOne();

  await ActivityLog.create({
    instituteId,
    action: `Deleted Parent: ${parent.name}`,
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Parent deleted successfully")
  );
});

export const getParentNumber = asyncHandler(async (req, res) => {
  const { parentId } = req.params;
  const instituteId = req.user.instituteId;

  const parent = await Parent.findOne({ _id: parentId, instituteId });
  if (!parent) {
    throw new ApiError(404, 'Parent not found');
  }

  res.status(200).json(new ApiResponse(200, { number: parent.number }, 'Number fetched successfully'));
});

export const resetParentNumber = asyncHandler(async (req, res) => {
  const { parentId } = req.params;
  const instituteId = req.user.instituteId;

  const parent = await Parent.findOneAndUpdate(
    { _id: parentId, instituteId },
    { number: 0 },
    { new: true }
  );

  if (!parent) {
    throw new ApiError(404, 'Parent not found');
  }

  res.status(200).json(new ApiResponse(200, { number: parent.number }, 'Number reset successfully'));
});

export const getChildAttendance = asyncHandler(async (req, res) => {
  const childIds = req.user.childrens.map(child => child._id);

  // Get attendance records but only select specific fields
  const attendanceRecords = await Attendance.find(
    { 'students.studentId': { $in: childIds } },
    {
      date: 1,
      classId: 1,
      teacherId: 1,
      instituteId: 1,
      // Only include students who are children of this parent
      students: {
        $elemMatch: {
          studentId: { $in: childIds }
        }
      }
    }
  ).lean();

  res.status(200).json({
    success: true,
    data: attendanceRecords
  });
});

export const getChildVouchers = asyncHandler(async (req, res) => {

  const childIds = req.user.childrens?.map(child => child._id);

  // Fetch voucher records for the parent's children
  const voucherRecords = await Voucher.find({
    student: { $in: childIds },
  }).lean();

  res.status(200).json({
    success: true,
    data: voucherRecords,
  });
});

export const getChildRecentMarks = asyncHandler(async (req, res) => {
  const childIds = req.user.childrens?.map(child => child._id);

  // Fetch recent marks for the parent's children
  const marksRecords = await Marks.find({
    student: { $in: childIds },
  }).lean();

  res.status(200).json({
    success: true,
    data: marksRecords,
  });
});

export const submitParentReport = asyncHandler(async (req, res) => {
  const { _id: parentId, childrens, instituteId } = req.user;
  const { studentId, reportType, description } = req.body;
  // Validate input
  if (!studentId || !reportType || !description?.trim()) {
    throw new ApiError(400, 'Student ID, report type, and description are required');
  }

  // Verify student is in parent's children array
  const child = childrens.find((c) => c._id.toString() === studentId);
  if (!child) {
    throw new ApiError(403, 'You can only submit reports for your own children');
  }

  // Verify student exists and belongs to the institute
  const student = await Student.findOne({ _id: studentId, instituteId: instituteId._id });
  if (!student) {
    throw new ApiError(404, 'Student not found or does not belong to your institute');
  }

  // Create report
  const report = await Report.create({
    student: studentId,
    parent: parentId,
    instituteId: instituteId._id,
    reportType,
    description: description.trim(),
  });

  await Admin.updateOne({ _id: instituteId }, { $inc: { number: 1 } });

  // Populate student name for response
  const populatedReport = await Report.findById(report._id).populate(
    'student',
    'name -_id'
  );

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        _id: populatedReport._id,
        studentName: populatedReport.student.name,
        reportType: populatedReport.reportType,
        description: populatedReport.description,
        status: populatedReport.status,
        createdAt: populatedReport.createdAt,
      },
      'Report submitted successfully'
    )
  );
});

export const getParentReports = asyncHandler(async (req, res) => {
  const { _id: parentId, instituteId } = req.user;

  // Fetch reports for the parent
  const reports = await Report.find({ parent: parentId, instituteId })
    .populate('student', 'name -_id')
    .sort({ createdAt: -1 })
    .lean();

  // Format reports for frontend
  const formattedReports = reports.map((report) => ({
    _id: report._id,
    studentName: report.student?.name || 'N/A',
    reportType: report.reportType,
    description: report.description,
    status: report.status,
    comments: report.comments,
    createdAt: report.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(200, formattedReports, 'Reports retrieved successfully')
  );
});

export const getParentReportCommentsNumber = asyncHandler(async (req, res) => {
  try {
    const { parentId } = req.params;
    const instituteId = req.user.instituteId;

    const parent = await Parent.findOne({ _id: parentId, instituteId });

    if (!parent) {
      throw new ApiError(404, 'Parent not found');
    }

    res.status(200).json(
      new ApiResponse(200, { number: parent.reportCommentsNumber }, 'Report comments number fetched successfully')
    );
  } catch (error) {
    console.log(error)
  }
});

export const resetParentReportCommentsNumber = asyncHandler(async (req, res) => {
  try {
    const { parentId } = req.params;
    const instituteId = req.user.instituteId;

    const parent = await Parent.findOneAndUpdate(
      { _id: parentId, instituteId },
      { reportCommentsNumber: 0 },
      { new: true }
    );

    if (!parent) {
      throw new ApiError(404, 'Parent not found');
    }

    res.status(200).json(
      new ApiResponse(200, { number: parent.reportCommentsNumber }, 'Report comments number reset successfully')
    );
  } catch (error) {
    console.log(error)
  }
});

const parentDashboardController = {
  getDashboardSummary: asyncHandler(async (req, res) => {
    const parentId = req.user._id;
    const instituteId = req.user.instituteId;
    const childIds = req.user.childrens?.map(child => child._id) || [];

    const summary = {
      parentDetails: { ...req.user.toObject() },
      childrenDetails: [],
      announcements: null,
      reports: null,
      parentAnnouncementCount : null,
      parentCommentCount : null,
    };

    // Fetch children details (class, subjects, attendance, marks, vouchers)
    if (childIds.length > 0) {
      const childrenDetails = await Promise.all(
        childIds.map(async (childId) => {
          const child = req.user.childrens.find(c => c._id.toString() === childId.toString());
          const childSummary = {
            studentId: childId,
            studentName: child?.name || 'N/A',
            rollNumber: child?.rollNumber || 'N/A',
            classDetails: null,
            subjects: [],
            attendance: [],
            marks: [],
            vouchers: [],
          };

          // Fetch child's class details
          const classData = await Class.findOne({
            classTitle: child?.studentClass,
            section: child?.section?.trim().toUpperCase(),
            instituteId,
          })
            .populate('classTeacher', 'name teacherId -_id')
            .populate({
              path: 'subjects',
              select: 'subjectName subjectTeacher -_id',
              populate: {
                path: 'subjectTeacher',
                select: 'name teacherId -_id',
              },
            });
          childSummary.classDetails = classData || null;

          // Fetch subjects for the child
          if (classData) {
            childSummary.subjects = classData.subjects.map(subject => ({
              subjectName: subject.subjectName,
              subjectTeacher: subject.subjectTeacher,
            }));
          }

          // Fetch child's attendance
          const attendanceRecords = await Attendance.find(
            {
              'students.studentId': childId,
              instituteId,
            },
            {
              classId: 1,
              teacherId: 1,
              date: 1,
              instituteId: 1,
              students: { $elemMatch: { studentId: childId } },
              createdAt: 1,
              updatedAt: 1,
            }
          ).sort({ date: -1 });
          childSummary.attendance = attendanceRecords.map(record => ({
            _id: record._id,
            date: record.date,
            status: record.students[0]?.status,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          }));

          // Fetch child's marks
          const studentMarks = await Marks.find({ student: childId, instituteId })
            .populate('student', 'name rollNumber -_id')
            .populate('subjectTeacher', 'name teacherId -_id')
            .populate('classTeacher', 'name teacherId -_id')
            .sort({ subject: 1 });
          childSummary.marks = studentMarks.map(marks => ({
            _id: marks._id,
            student: marks.student,
            subject: marks.subject,
            subjectTeacher: marks.subjectTeacher,
            classTeacher: marks.classTeacher,
            classTitle: marks.classTitle,
            section: marks.section,
            assessmentType: marks.assessmentType,
            totalMarks: marks.totalMarks,
            obtainedMarks: marks.obtainedMarks,
            grade: marks.grade,
            createdAt: marks.createdAt,
            updatedAt: marks.updatedAt,
          }));

          // Fetch child's vouchers
          const vouchers = await Voucher.find({ student: childId, instituteId });
          childSummary.vouchers = vouchers.map(voucher => ({
            _id: voucher._id,
            voucherId: voucher.voucherId,
            amount: voucher.amount,
            dueDate: voucher.dueDate,
            status: voucher.status,
            createdAt: voucher.createdAt,
            updatedAt: voucher.updatedAt,
          }));

          return childSummary;
        })
      );
      summary.childrenDetails = childrenDetails;
    }
    // Fetch teacher’s contact number
    const parent = await Parent.findOne({ _id: parentId, instituteId });
    summary.parentAnnouncementCount = parent ? { number: parent.number } : null;
    summary.parentCommentCount = parent ? { number: parent.reportCommentsNumber } : null;

    // Fetch announcements for the parent role
    const announcements = await Announcement.find({
      instituteId,
      $or: [
        { audience: 'parents' },
        { audience: 'all' },
        { audience: { $regex: 'parents', $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .select('title message createdAt audience');
    summary.announcements = announcements;

    // Fetch parent's reports
    const reports = await Report.find({ parent: parentId, instituteId })
      .populate('student', 'name -_id')
      .sort({ createdAt: -1 })
      .lean();
    summary.reports = reports.map(report => ({
      _id: report._id,
      studentName: report.student?.name || 'N/A',
      reportType: report.reportType,
      description: report.description,
      status: report.status,
      comments: report.comments,
      createdAt: report.createdAt,
    }));

    return res.status(200).json(
      new ApiResponse(200, summary, 'Parent dashboard summary fetched successfully')
    );
  }),
};

export default parentDashboardController;

