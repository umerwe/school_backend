import { Class } from "../models/class.model.js";
import { Teacher } from "../models/teacher.model.js";
import { Subject } from "../models/subject.model.js"
import { Student } from '../models/student.model.js'
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ActivityLog } from "../models/activityLog.model.js";
import { Attendance } from "../models/attendance.model.js";
import { Announcement } from "../models/announcements.js";
import { Marks } from "../models/marks.model.js";


export const updateTeacherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const logoFile = req.file;
  const instituteId = req.user._id;

  if (!Object.keys(updateData).length && !logoFile) {
    throw new ApiError(400, 'Please provide at least one field to update');
  }

  // Check if teacher exists and belongs to this institute
  const teacher = await Teacher.findOne({ _id: id, instituteId });
  if (!teacher) {
    throw new ApiError(404, 'Teacher not found');
  }

  if (logoFile) {
    const logo = await uploadOnCloudinary(logoFile.path);
    if (!logo) {
      throw new ApiError(500, "Failed to upload logo");
    }
    updateData.logo = logo.url;
  }

  if (updateData.email) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(updateData.email)) {
      throw new ApiError(400, 'Invalid email format');
    }
  }

  if (updateData.email || updateData.teacherId) {
    const filter = {
      _id: { $ne: id },
      instituteId // ensure uniqueness within the same institute
    };
    if (updateData.email) filter.email = updateData.email;
    if (updateData.teacherId) filter.teacherId = updateData.teacherId;

    const existingTeacher = await Teacher.findOne(filter);
    if (existingTeacher) {
      throw new ApiError(400,
        existingTeacher.email === updateData.email
          ? 'Email already in use'
          : 'Teacher ID already taken'
      );
    }
  }

  if (updateData.qualifications) {
    updateData.qualifications = Array.isArray(updateData.qualifications)
      ? updateData.qualifications
      : [updateData.qualifications];
  }

  const updatedTeacher = await Teacher.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  const teacherData = updatedTeacher.toObject();

  await ActivityLog.create({
    instituteId,
    action: `Updated Teacher: ${updateData.name}`,
  });

  delete teacherData.password;
  delete teacherData.refreshToken;

  res.status(200).json(
    new ApiResponse(200, teacherData, 'Teacher updated successfully')
  );
});

export const deleteTeacherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instituteId = req.user._id;

  const teacher = await Teacher.findOne({ _id: id, instituteId });
  if (!teacher) {
    throw new ApiError(404, "Teacher not found.");
  }

  const assignedClass = await Class.findOne({ classTeacher: id, instituteId });
  if (assignedClass) {
    throw new ApiError(
      400,
      `${teacher.name} is currently assigned as the class teacher of ${assignedClass.classTitle}-${assignedClass.section}. Please update the class teacher before deleting.`
    );
  }

  const deletedTeacher = await Teacher.findOneAndDelete({ _id: id, instituteId });

  await ActivityLog.create({
    instituteId,
    action: `Deleted Teacher: ${teacher.name}`,
  });

  return res.status(200).json(
    new ApiResponse(200, deletedTeacher, "Teacher deleted successfully.")
  );
});


export const getTeacherById = asyncHandler(async (req, res) => {
  const instituteId = req.user._id; // Get institute ID from authenticated user
  const { teacherId } = req.params; // Get teacher ID from URL

  // Check if teacher exists in the same institute
  const teacher = await Teacher.findOne({ _id: teacherId, instituteId });
  if (!teacher) {
    throw new ApiError(404, 'Teacher not found');
  }

  // Remove sensitive fields before sending response
  const teacherData = teacher.toObject();
  delete teacherData.password;
  delete teacherData.refreshToken;

  res.status(200).json(
    new ApiResponse(200, teacherData, 'Teacher fetched successfully')
  );
});


export const getAllTeachers = asyncHandler(async (req, res) => {
  const id = req.user._id;

  const teachers = await Teacher.find({ instituteId: id })
    .populate('classTeacherOf', 'classTitle section')
    .sort({ name: 1 })

  if (!teachers || teachers.length === 0) {
    throw new ApiError(404, 'No teachers found');
  }

  const sanitizedTeachers = teachers.map(teacher => {
    const teacherObj = teacher.toObject();

    const {
      _id,
      name,
      teacherId,
      classTeacherOf,
      logo,
      email,
      phoneNumber,
      role,
      department,
      dateOfBirth,
      address,
      qualifications,
      emergencyContact,
      bloodGroup,
      nationality,
      createdAt,
      updatedAt,
      __v
    } = teacherObj;

    return {
      _id,
      name,
      teacherId,
      classTeacherOf,
      logo,
      email,
      phoneNumber,
      role,
      department,
      dateOfBirth,
      address,
      qualifications,
      emergencyContact,
      bloodGroup,
      nationality,
      createdAt,
      updatedAt,
      __v
    };
  });

  return res.status(200).json(
    new ApiResponse(200, sanitizedTeachers, 'All teachers fetched successfully')
  );
});

export const teacherSubjects = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instituteId = req.user.instituteId;

  const subjectData = await Subject.find({ subjectTeacher: id, instituteId })
    .sort({ classTitle: 1, section: 1, subjectName: 1 });

  if (!subjectData || subjectData.length === 0) {
    throw new ApiError(404, 'No subjects assigned to this teacher.');
  }

  const subjects = subjectData.map(({ classTitle, section, subjectName }) => ({
    classTitle,
    section,
    subjectName
  }));

  return res.status(200).json(
    new ApiResponse(200, subjects, "Subjects assigned to teacher retrieved successfully.")
  );
});

export const teacherClassDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instituteId = req.user.instituteId;
  const classData = await Class.findOne({ classTeacher: id, instituteId })
    .populate('classTeacher', 'name teacherId -_id')
    .populate({
      path: 'subjects',
      select: 'subjectName subjectTeacher -_id',
      populate: {
        path: 'subjectTeacher',
        select: 'name teacherId -_id',
      }
    })
    .populate('students', 'name rollNumber -_id');
  if (!classData) {
    throw new ApiError(404, 'Class not found for this teacher.');
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      classData,
      "Class details with students and subjects retrieved successfully."
    )
  );
});

export const classStudents = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const instituteId = req.user.instituteId;

  const teacher = await Teacher.findOne({ _id: id, instituteId }).populate('classTeacherOf');
  if (!teacher) {
    throw new ApiError(404, 'Teacher not found');
  }

  const students = await Student.find({
    studentClass: teacher.classTeacherOf.classTitle,
    section: teacher.classTeacherOf.section,
    instituteId
  }).populate('guardian', 'name email phoneNumber')

  if (!students || students.length === 0) {
    throw new ApiError(404, 'No Student found');
  }

  const sanitizedStudents = students.map(student => {
    const {
      _id, name, rollNumber, email, role, logo,
      studentClass, section, admissionYear, dateOfBirth,
      address, emergencyContact, bloodGroup, nationality,
      guardian, createdAt, updatedAt, __v
    } = student.toObject();

    return {
      _id, name, rollNumber, email, role, logo,
      studentClass, section, admissionYear, dateOfBirth,
      address, emergencyContact, bloodGroup, nationality,
      guardian, createdAt, updatedAt, __v
    };
  });

  return res.status(200).json(
    new ApiResponse(200, sanitizedStudents, 'All Students fetched successfully')
  );
});

export const getTeacherNumber = asyncHandler(async (req, res) => {
  try {
    const { teacherId } = req.params;
    const instituteId = req.user.instituteId;

    const teacher = await Teacher.findOne({ _id: teacherId, instituteId });
    if (!teacher) {
      throw new ApiError(404, 'Teacher not found');
    }

    res.status(200).json(new ApiResponse(200, { number: teacher.number }, 'Number fetched successfully'));
  } catch (error) {
    console.log(error)
  }
});

export const resetTeacherNumber = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const instituteId = req.user.instituteId;

  const teacher = await Teacher.findOneAndUpdate(
    { _id: teacherId, instituteId },
    { number: 0 },
    { new: true }
  );

  if (!teacher) {
    throw new ApiError(404, 'Teacher not found');
  }

  res.status(200).json(new ApiResponse(200, { number: teacher.number }, 'Number reset successfully'));
});

const teacherDashboardController = {
  getDashboardSummary: asyncHandler(async (req, res) => {
    const teacherId = req.user._id;
    const instituteId = req.user.instituteId;
    const summary = {
      classDetails: null,
      students: null,
      subjects: null,
      attendance: null,
      announcements: null,
      teacherNumber: null,
      classMarks: null,
    };

    // Fetch teacher’s class details (if they are a class teacher)
    const classData = await Class.findOne({ classTeacher: teacherId, instituteId })
      .populate('classTeacher', 'name teacherId -_id')
      .populate({
        path: 'subjects',
        select: 'subjectName subjectTeacher -_id',
        populate: {
          path: 'subjectTeacher',
          select: 'name teacherId -_id',
        },
      })
      .populate('students', 'name rollNumber -_id');
    summary.classDetails = classData || null;

    // Fetch students in the teacher’s class
    if (classData) {
      const students = await Student.find({
        studentClass: classData.classTitle,
        section: classData.section,
        instituteId,
      })
        .populate('guardian', 'name email phoneNumber')
        .sort({ name: 1 });
      summary.students = students.map(student => {
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
          __v,
        } = student.toObject();
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
          __v,
        };
      });
    } else {
      summary.students = [];
    }

    // Fetch subjects taught by the teacher
    const subjectData = await Subject.find({ subjectTeacher: teacherId, instituteId })
      .sort({ classTitle: 1, section: 1, subjectName: 1 });
    summary.subjects = subjectData.map(({ classTitle, section, subjectName }) => ({
      classTitle,
      section,
      subjectName,
    }));

    // Fetch attendance records for the teacher’s class
    if (classData) {
      const attendanceRecords = await Attendance.find({
        instituteId,
        classId: classData._id,
      })
        .populate('students.studentId', 'name rollNumber')
        .sort({ date: -1 });
      summary.attendance = attendanceRecords.map(record => ({
        _id: record._id,
        date: record.date,
        students: record.students.map(s => ({
          studentId: s?.studentId?._id,
          name: s?.studentId?.name,
          rollNumber: s?.studentId?.rollNumber,
          status: s?.status,
        })),
      }));
    } else {
      summary.attendance = [];
    }

    // Fetch announcements for the teacher’s role
    const announcements = await Announcement.find({
      instituteId,
      $or: [
        { audience: 'teachers' },
        { audience: 'all' },
        { audience: { $regex: 'teachers', $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .select('title message createdAt audience');
    summary.announcements = announcements;

    // Fetch teacher’s contact number
    const teacher = await Teacher.findOne({ _id: teacherId, instituteId });
    summary.teacherNumber = teacher ? { number: teacher.number } : null;

    // Fetch all marks for the teacher’s class
    if (classData) {
      const fetchedMarks = await Marks.find({
        classTeacher: teacherId,
        instituteId,
      })
        .populate([
          { path: 'student', select: 'name rollNumber -_id' },
          { path: 'subjectTeacher', select: 'name -_id' },
          { path: 'classTeacher', select: 'name teacherId -_id' },
        ])
        .sort({ student: 1, subject: 1 });
      summary.classMarks = fetchedMarks.map(marks => ({
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
    } else {
      summary.classMarks = [];
    }

    return res.status(200).json(
      new ApiResponse(200, summary, 'Teacher dashboard summary fetched successfully')
    );
  }),
};

export default teacherDashboardController;








