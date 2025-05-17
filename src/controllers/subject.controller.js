import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from '../utils/ApiError.js';
import { Class } from "../models/class.model.js";
import { Subject } from "../models/subject.model.js";
import { Teacher } from "../models/teacher.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createSubject = asyncHandler(async (req, res) => {
        const id = req.user._id;
        const { classTitle, section, subjectName, teacherName } = req.body;

        if (!classTitle || !section || !subjectName || !teacherName) {
            throw new ApiError(400, "All fields (classTitle, section, subjectName, teacherName) are required.");
        }

        // Find the Class
        const classData = await Class.findOne(
            {
                classTitle:Number(classTitle),
                section: section.toUpperCase(),
                instituteId: id
            });
        if (!classData) {
            throw new ApiError(400, `Class ${classTitle}-${section} does not exist.`);
        }

        // Check for existing subject
        const existingSubject = await Subject.findOne({
            classTitle,
            section : section.toUpperCase(),
            subjectName,
            instituteId: id
        });

        if (existingSubject) {
            throw new ApiError(400, `Subject(${subjectName}) already exists for class ${classTitle}-${section}.`);
        }
        // Find the Teacher
        const teacher = await Teacher.findOne({ name: teacherName, instituteId: id });
        if (!teacher) {
            throw new ApiError(400, `Teacher(${teacherName}) not found.`);
        }


        // Create Subject
        const newSubject = await Subject.create({
            subjectName,
            subjectTeacher: teacher._id,
            classTitle,
            section : section.toUpperCase(),
            instituteId: id
        });

        // Add subject to class
        classData.subjects.push(newSubject._id);
        await classData.save();

        return res.status(200).json(
            new ApiResponse(200, newSubject, 'Subject created successfully.')
        );
});

const updateSubjectById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { subjectName, teacherName } = req.body;
    const instituteId = req.user._id;

    if (!subjectName && !teacherName) {
        throw new ApiError(400, "Please provide at least one field to update");
    }

    // 1. Find the subject to update (secured by instituteId)
    const subjectToUpdate = await Subject.findOne({ _id: id, instituteId });
    if (!subjectToUpdate) {
        throw new ApiError(404, "Subject not found.");
    }

    // 5. Get final subject name (new or existing)
    const finalSubjectName = subjectName || subjectToUpdate.subjectName;

    // 6. Check if subject already exists in the target class (for replacement)
    const existingSubjectInNewClass = await Subject.findOne({
        classTitle: subjectToUpdate.classTitle,
        section: subjectToUpdate.section,
        subjectName: finalSubjectName,
        instituteId, // secure match
        _id: { $ne: id } // Exclude current subject
    });

    if (existingSubjectInNewClass) {
        throw new ApiError(400, `Subject ${subjectName} already Exist in Class ${subjectToUpdate.classTitle}-${subjectToUpdate.section}`)
    }

    if (subjectName) subjectToUpdate.subjectName = subjectName;

    if (teacherName) {
        const teacher = await Teacher.findOne({ name: teacherName, instituteId });
        if (!teacher) {
            throw new ApiError(400, `Teacher ${teacherName} not found.`);
        }
        subjectToUpdate.subjectTeacher = teacher._id;
    }

    // 10. Save the updated subject
    await subjectToUpdate.save();

    return res.status(200).json(
        new ApiResponse(200, subjectToUpdate, 'Subject updated successfully.')
    );
});


const deleteSubjectById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const instituteId = req.user._id;

    // Validate ID
    if (!id) {
        throw new ApiError(400, "Subject ID is required in params.");
    }

    // Find the subject
    const subject = await Subject.findOne({ _id: id, instituteId });
    if (!subject) {
        throw new ApiError(404, "Subject not found.");
    }

    // Delete the subject
    await subject.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, null, "Subject deleted successfully.")  // No need to return empty object
    );
});


const getAllSubjects = asyncHandler(async (req, res) => {
    const instituteId = req.user._id
    // Fetch all students
    const subjects = await Subject.find({ instituteId })
        .populate("subjectTeacher", "name teacherId")
        .sort({ classTitle: 1, section: 1, subjectName: 1 })

    // Handle no students found
    if (!subjects || subjects.length === 0) {
        throw new ApiError(404, 'No Subject found');
    }

    // Sanitize and reorder each student object
    const sanitizedSubjects = subjects.map(subject => {
        const s = subject.toObject();
        const {
            _id,
            subjectName,
            classTitle,
            section,
            subjectTeacher,
            createdAt,
            updatedAt,
            __v
        } = s
        return {
            _id,
            subjectName,
            classTitle,
            section,
            subjectTeacher,
            createdAt,
            updatedAt,
            __v
        }
    });

    // Send response
    return res.status(200).json(
        new ApiResponse(200, sanitizedSubjects, 'All Subjects fetched successfully')
    );
});


export {
    createSubject,
    updateSubjectById,
    deleteSubjectById,
    getAllSubjects
}