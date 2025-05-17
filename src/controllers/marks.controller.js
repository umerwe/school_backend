import { Student } from "../models/student.model.js";
import { Subject } from '../models/subject.model.js'
import { Class } from '../models/class.model.js'
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Marks } from "../models/marks.model.js";

const submitMarks = asyncHandler(async (req, res) => {
    const instituteId = req.user.instituteId;
    const {
        name,
        rollNumber,
        subject,
        totalMarksInput,
        obtainedMarksInput,
        assessmentType
    } = req.body;

    const teacher = req.user;

    const totalMarks = Number(totalMarksInput);
    const obtainedMarks = Number(obtainedMarksInput);

    if (!name || !rollNumber || !subject || !totalMarks || !obtainedMarks || !assessmentType) {
        throw new ApiError(400, "All fields are required including assessment type.");
    }

    const allowedAssessmentTypes = [
        'Class Test',
        'Monthly Test',
        'Assignment',
        'Mid Term Exam',
        'Pre-Board Exam',
        'Final Term Exam',
        'Annual Exam'
    ];

    if (!allowedAssessmentTypes.includes(assessmentType)) {
        throw new ApiError(400, "Invalid assessment type.");
    }

    const student = await Student.findOne({ name, rollNumber, instituteId });
    if (!student) {
        throw new ApiError(404, `Student with name "${name}" and roll number "${rollNumber}" does not exist.`);
    }

    const existedMarks = await Marks.findOne({
        student: student._id,
        classTitle: student.studentClass,
        section: student.section,
        subject: subject,
        assessmentType: assessmentType,
        instituteId
    });

    if (existedMarks) {
        throw new ApiError(400, `Marks for subject "${subject}" and assessment "${assessmentType}" have already been submitted for this student.`);
    }

    const classData = await Class.findOne({
        classTitle: student.studentClass,
        section: student.section,
        classTeacher: String(teacher._id),
        instituteId
    });

    if (!classData) {
        throw new ApiError(403, "Only the assigned class teacher can submit marks.");
    }

    const subjectData = await Subject.findOne({
        classTitle: student.studentClass,
        section: student.section,
        subjectName: subject.trim(),
        instituteId
    });

    if (!subjectData) {
        throw new ApiError(404, `Subject "${subject}" not found for this class and section.`);
    }

    if (obtainedMarks > totalMarks) {
        throw new ApiError(400, "Obtained marks cannot exceed total marks.");
    }

    const percentage = (obtainedMarks / totalMarks) * 100;
    let grade = "F";

    if (percentage >= 90) grade = "A+";
    else if (percentage >= 80) grade = "A";
    else if (percentage >= 70) grade = "B";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 50) grade = "D";

    const submittedMarks = await Marks.create({
        student: student._id,
        subject: subjectData.subjectName,
        subjectTeacher: subjectData.subjectTeacher,
        classTeacher: classData.classTeacher,
        classTitle: student.studentClass,
        section: student.section,
        totalMarks,
        obtainedMarks,
        grade,
        assessmentType,
        instituteId
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                marks: submittedMarks,
                message: `${student.name}'s marks for subject "${subject}" (${assessmentType}) submitted successfully by ${teacher.name}.`
            },
            "Marks submitted successfully"
        )
    );
});

const AllStudentsMarks = asyncHandler(async (req, res) => {
    const { teacherId } = req.params;
    const instituteId = req.user.instituteId;
    const fetchedMarks = await Marks.find({
        classTeacher: teacherId,
        instituteId
    })
        .populate([
            { path: 'student', select: 'name rollNumber -_id' },
            { path: 'subjectTeacher', select: 'name -_id' },
            { path: 'classTeacher', select: 'name teacherId -_id' }
        ])
        .sort({ student: 1, subject: 1 });

    if (!fetchedMarks || fetchedMarks.length === 0) {
        throw new ApiError(404, "Marks not found");
    }

    const formattedMarks = fetchedMarks.map(marks => ({
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
        updatedAt: marks.updatedAt
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            formattedMarks,
            "Marks fetched successfully"
        )
    );
});

const deleteMarks = asyncHandler(async (req, res) => {
    const { marksId } = req.params;
    const teacher = req.user;
    const instituteId = req.user.instituteId

    // Find the marks entry
    const marks = await Marks.findOne({ _id: marksId, instituteId }).populate("student");
    if (!marks) {
        throw new ApiError(404, "Marks not found");
    }

    // Allow deletion only if the logged-in user is the class teacher of that section
    const classData = await Class.findOne({
        classTitle: marks.classTitle,
        section: marks.section,
        classTeacher: teacher._id,
        instituteId
    });

    if (!classData) {
        throw new ApiError(403, "Only the class teacher can delete marks");
    }

    // Delete the marks
    await Marks.findByIdAndDelete({ _id: marksId, instituteId });

    return res.status(200).json(
        new ApiResponse(
            200,
            null,
            `Marks for student "${marks.student.name}" have been successfully deleted`
        )
    );
});

const getAverageMarks = asyncHandler(async (req, res) => {
    const instituteId = req.user._id;

    // First get all marks for the institute
    const allMarks = await Marks.find({ instituteId })
        .select('obtainedMarks totalMarks')
        .lean();

    if (!allMarks || allMarks.length === 0) {
        return res.status(200).json(
            new ApiResponse(200, { average: null }, "No marks data available")
        );
    }

    // Calculate average percentage
    const totalPercentage = allMarks.reduce((sum, mark) => {
        return sum + (mark.obtainedMarks / mark.totalMarks) * 100;
    }, 0);

    const average = totalPercentage / allMarks.length;

    return res.status(200).json(
        new ApiResponse(200,
            {
                average: average.toFixed(1),
                totalRecords: allMarks.length
            },
            "Average marks calculated successfully"
        )
    );
});

const getAverageMarksPerSubject = asyncHandler(async (req, res) => {
    try {
        const { classTeacherOf } = req.user;
        const { instituteId } = req.user

        if (!classTeacherOf || !classTeacherOf._id) {
            return res.status(400).json(
                new ApiResponse(400, {}, "Teacher is not assigned to any class")
            );
        }
        const classData = await Class.findOne({ _id: classTeacherOf._id, instituteId });

        // Fetch all marks for the teacher's assigned class
        const allMarks = await Marks.find(
            {
                classTitle: classData.classTitle,
                section: classData.section, 
                instituteId
            })
            .select('subject obtainedMarks totalMarks')
            .lean();

        if (!allMarks || allMarks.length === 0) {
            return res.status(200).json(
                new ApiResponse(200, { marksPerSubject: [] }, "No marks data available for this class")
            );
        }

        // Group marks by subject and calculate average percentage
        const marksBySubject = {};
        allMarks.forEach(mark => {
            const subject = mark.subject;
            if (!marksBySubject[subject]) {
                marksBySubject[subject] = { totalPercentage: 0, count: 0 };
            }
            const percentage = (mark.obtainedMarks / mark.totalMarks) * 100;
            marksBySubject[subject].totalPercentage += percentage;
            marksBySubject[subject].count += 1;
        });

        // Calculate average for each subject
        const marksPerSubject = Object.keys(marksBySubject).map(subject => ({
            subject,
            average: Number((marksBySubject[subject].totalPercentage / marksBySubject[subject].count).toFixed(1))
        }));

        return res.status(200).json(
            new ApiResponse(
                200,
                { marksPerSubject, totalRecords: allMarks.length },
                "Average marks per subject calculated successfully"
            )
        );
    } catch (error) {
        console.log(error)
    }
});


export {
    submitMarks,
    AllStudentsMarks,
    deleteMarks,
    getAverageMarks,
    getAverageMarksPerSubject
}