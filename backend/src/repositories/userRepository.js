import User from '../models/User.js';

class UserRepository {
    async create(userData) {
        const user = new User(userData);
        return await user.save();
    }

    async findById(id, selectPassword = false) {
        const query = User.findById(id);
        if (selectPassword) {
            query.select('+password');
        }
        return await query.exec();
    }

    async findByEmail(email, selectPassword = false) {
        const query = User.findOne({ email });
        if (selectPassword) {
            query.select('+password');
        }
        return await query.exec();
    }

    async findByGoogleId(googleId) {
        return await User.findOne({ googleId });
    }

    async findOne(filter) {
        return await User.findOne(filter);
    }


    async findByResetToken(token) {
        return await User.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });
    }

    async findAll(filters = {}, options = {}) {
        const { page = 1, limit = 20, sort = { createdAt: -1 } } = options;
        const skip = (page - 1) * limit;

        const query = User.find(filters)
            .sort(sort)
            .skip(skip)
            .limit(limit);

        const users = await query.exec();
        const total = await User.countDocuments(filters);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    async update(id, updateData) {
        return await User.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );
    }

    async delete(id) {
        return await User.findByIdAndDelete(id);
    }

    async updateLastLogin(id) {
        return await User.findByIdAndUpdate(
            id,
            { lastLogin: new Date() },
            { new: true }
        );
    }

    async deactivate(id) {
        return await User.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );
    }

    async activate(id) {
        return await User.findByIdAndUpdate(
            id,
            { isActive: true },
            { new: true }
        );
    }

    async exists(email) {
        const count = await User.countDocuments({ email });
        return count > 0;
    }

    async countByRole(role) {
        return await User.countDocuments({ role });
    }

    async search(searchTerm, options = {}) {
        const { page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;

        const searchQuery = {
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } },
            ],
        };

        const users = await User.find(searchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await User.countDocuments(searchQuery);

        return {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}

export default new UserRepository();
