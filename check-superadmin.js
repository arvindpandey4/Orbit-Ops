import mongoose from 'mongoose';
import User from './backend/src/models/User.js';
import config from './backend/src/config/index.js';

async function checkSuperAdmin() {
    try {
        await mongoose.connect(config.database.uri);
        console.log('Connected to MongoDB');

        const superAdmin = await User.findOne({ email: 'avisandhyatech@gmail.com' });

        if (superAdmin) {
            console.log('\n✅ Super Admin found:');
            console.log('Name:', superAdmin.name);
            console.log('Email:', superAdmin.email);
            console.log('Role:', superAdmin.role);
            console.log('IsActive:', superAdmin.isActive);
            console.log('ID:', superAdmin._id);
        } else {
            console.log('\n❌ Super Admin NOT found!');
            console.log('Creating Super Admin...');

            const newSuperAdmin = await User.create({
                name: 'Super Admin',
                email: 'avisandhyatech@gmail.com',
                password: 'admin1234',
                role: 'SuperAdmin',
                isActive: true
            });

            console.log('\n✅ Super Admin created:');
            console.log('Name:', newSuperAdmin.name);
            console.log('Email:', newSuperAdmin.email);
            console.log('Role:', newSuperAdmin.role);
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkSuperAdmin();
