import { Class } from "../models/class.model.js";
import { Teacher } from "../models/teacher.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const createClass = asyncHandler(async (req, res) => {
    const id = req.user._id
    const { classTitle, section, classTeacherIdOrName } = req.body;

    if (!classTitle || !section || !classTeacherIdOrName) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if class exists
    const existedClass = await Class.findOne({ classTitle, section, instituteId: id });
    if (existedClass) {
        throw new ApiError(400, `Class(${classTitle}-${section}) already exists`);
    }

    // Find teacher
    const teacher = await Teacher.findOne({
        $or: [
            { teacherId: classTeacherIdOrName },
            { name: classTeacherIdOrName }
        ]
    });

    if (!teacher) {
        throw new ApiError(400, 'Invalid Teacher ID or Name');
    }

    // Check if teacher is already a class teacher
    const existingClassWithTeacher = await Class.findOne({ classTeacher: teacher._id });
    if (existingClassWithTeacher) {
        throw new ApiError(400, 'This teacher is already assigned to another class');
    }

    // Create the class
    const createdClass = await Class.create({
        classTitle,
        section,
        classTeacher: teacher._id,
        instituteId: id
    });

    // Update the teacher's classTeacherOf field
    teacher.classTeacherOf = createdClass._id;
    await teacher.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            createdClass,
            'Class created successfully'
        )
    );
});

const updateClass = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { classTeacherIdOrName } = req.body;
        const instituteId = req.user._id;  // Institute ID from authenticated user

        // Validate input
        if (!classTeacherIdOrName) {
            throw new ApiError(400, "Please provide class teacher ID or name");
        }

        // Find class by ID and ensure it's for the same institute
        const classToUpdate = await Class.findOne({ _id: id, instituteId });
        if (!classToUpdate) {
            throw new ApiError(404, "Class not found");
        }

        // Find teacher by ID or name
        const teacher = await Teacher.findOne({
            $or: [
                { teacherId: classTeacherIdOrName },
                { name: classTeacherIdOrName }
            ],
            instituteId // Ensure teacher is in the same institute
        });

        if (!teacher) {
            throw new ApiError(400, "No teacher found with the given ID or name");
        }


        // Check if teacher is already assigned to a different class
        const teacherInOtherClass = await Class.findOne({
            classTeacher: teacher._id,
            _id: { $ne: id }
        });

        if (teacherInOtherClass) {
            throw new ApiError(400, "This teacher is already assigned to another class");
        }

        // Get previous teacher (if exists)
        const previousTeacher = await Teacher.findById(classToUpdate.classTeacher);

        // Assign new teacher to class
        classToUpdate.classTeacher = teacher._id;
        const updatedClass = await classToUpdate.save();

        // Remove reference from previous teacher (if necessary)
        if (!previousTeacher.classTeacherOf && !previousTeacher._id.equals(teacher._id) ) {
            previousTeacher.classTeacherOf = previousTeacher?.classTeacherOf.filter(
                (classId) => !classId.equals(classToUpdate._id)
            );
            await previousTeacher.save({ validateBeforeSave: false });
        }

        // Add reference to new teacher (if necessary)
        if (!teacher?.classTeacherOf || !teacher?.classTeacherOf?.equals(classToUpdate._id)) {
            teacher.classTeacherOf = classToUpdate._id;
            await teacher.save({ validateBeforeSave: false })
        }

        return res.status(200).json(
            new ApiResponse(200, updatedClass, "Class teacher updated successfully")
        );
    } catch (error) {
        console.log(error)
    }
});

const deleteClass = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const instituteId = req.user._id;  // Institute ID from authenticated user

    // Find and delete class by ID and ensure it belongs to the same institute
    const deletedClass = await Class.findOneAndDelete({ _id: id, instituteId });

    if (!deletedClass) {
        throw new ApiError(404, "Class not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Class deleted successfully")
    );
});

const getAllClasses = asyncHandler(async (req, res) => {
    const classes = await Class.aggregate([
        {
            $match: {
                instituteId: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        // Lookup classTeacher (only once)
        {
            $lookup: {
                from: "teachers",
                localField: "classTeacher",
                foreignField: "_id",
                as: "classTeacher"
            }
        },
        {
            $set: {
                classTeacher: {
                    $arrayElemAt: ["$classTeacher", 0]
                }
            }
        },
        // Lookup students
        {
            $lookup: {
                from: "students",
                localField: "students",
                foreignField: "_id",
                as: "students"
            }
        },
        // Lookup subjects
        {
            $lookup: {
                from: "subjects",
                localField: "subjects",
                foreignField: "_id",
                as: "subjects"
            }
        },
        // Add total counts
        {
            $addFields: {
                totalStudents: { $size: "$students" },
                totalSubjects: { $size: "$subjects" }
            }
        },
        // Unwind subjects to populate subjectTeacher
        {
            $unwind: {
                path: "$subjects",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "teachers",
                localField: "subjects.subjectTeacher",
                foreignField: "_id",
                as: "subjectTeacherInfo"
            }
        },
        {
            $set: {
                "subjects.subjectTeacher": {
                    $arrayElemAt: ["$subjectTeacherInfo", 0]
                }
            }
        },
        // Regroup to reconstruct array of subjects
        {
            $group: {
                _id: "$_id",
                classTitle: { $first: "$classTitle" },
                section: { $first: "$section" },
                classTeacher: { $first: "$classTeacher" },
                students: { $first: "$students" },
                subjects: { $push: "$subjects" },
                totalStudents: { $first: "$totalStudents" },
                totalSubjects: { $first: "$totalSubjects" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" }
            }
        },
        // Sort the results
        {
            $sort: {
                classTitle: 1,
                section: 1
            }
        },
        // Final shape of output
        {
            $project: {
                classTitle: 1,
                section: 1,
                classTeacher: {
                    name: "$classTeacher.name",
                    teacherId: "$classTeacher.teacherId"
                },
                students: {
                    $map: {
                        input: "$students",
                        as: "student",
                        in: {
                            name: "$$student.name",
                            rollNumber: "$$student.rollNumber"
                        }
                    }
                },
                subjects: {
                    $map: {
                        input: "$subjects",
                        as: "subject",
                        in: {
                            subjectName: "$$subject.subjectName",
                            subjectTeacher: {
                                name: "$$subject.subjectTeacher.name",
                                teacherId: "$$subject.subjectTeacher.teacherId"
                            }
                        }
                    }
                },
                totalStudents: 1,
                totalSubjects: 1,
                createdAt: 1,
                updatedAt: 1
            }
        }
    ]);

    if (!classes || classes.length === 0) {
        throw new ApiError(404, "No Classes found");
    }

    return res.status(200).json(
        new ApiResponse(200, classes, "All classes fetched successfully")
    );
});




export {
    createClass,
    updateClass,
    deleteClass,
    getAllClasses
}