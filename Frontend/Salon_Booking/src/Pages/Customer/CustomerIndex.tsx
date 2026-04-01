import React from 'react';
import { Calendar, } from 'lucide-react';
import Deshbord from '../../Components/Ui/Deshbord';


const EmployeeIndex: React.FC = () => {
    const superAdminMenuItems = [
        { key: '/customer/booking', icon: <Calendar className='w-5 h-5' />, label: 'My Bookings' },
        { key: '/customer/appointment', icon: <Calendar className='w-5 h-5' />, label: 'Book Appointment' },
    ];
    
    return (    
        <>
            <Deshbord
                menuItems={superAdminMenuItems}
                appName="Salon Booking Portal"
            />
        </>
    );
};

export default EmployeeIndex;