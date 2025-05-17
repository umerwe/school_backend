import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { Admin } from '../models/admin.model.js';
import { Teacher } from '../models/teacher.model.js';
import { Student } from '../models/student.model.js';
import { Parent } from '../models/parent.model.js';

export const createRoleBasedJWTMiddleware = () => {
    return async (req, res, next) => {
        try {

            const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', '').trim();

            if (!token) {
                throw new ApiError(400, `Please login first`);
            }

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

            let user;
            if (decoded.role === 'admin') {
                user = await Admin.findById(decoded._id).select('-password -refreshToken');
            } else if (decoded.role === 'teacher') {
                user = await Teacher.findById(decoded._id).select('-password -refreshToken')
                    .populate({
                        path: 'classTeacherOf',
                        populate: [
                            {
                                path: 'subjects', model: 'Subject', populate: {
                                    path: 'subjectTeacher'
                                }
                            },
                            { path: 'students', model: 'Student' }
                        ]
                    })
                    .populate('instituteId')
                    .lean();
            } else if (decoded.role === 'student') {
                user = await Student.findById(decoded._id).select('-password -refreshToken').populate('instituteId', 'instituteName email');
            } else if (decoded.role === 'parent') {
                user = await Parent.findById(decoded._id)
                    .select('-password -refreshToken')
                    .populate('childrens', 'name studentClass section email')
                    .populate('instituteId', 'instituteName email');
            }

            if (!user) {
                throw new ApiError(401, 'Invalid or expired token');
            }
            req.user = user; // Attach the correct user model to the request object
            next();
        } catch (err) {
            res.status(401).json({ message: err.message || "Unauthorized" });
        }
    };
};
