using System;

namespace SalonBackend.Models.Dtos
{
    public class BookingDto
    {
        public  string StaffId { get; set; }  = string.Empty;
        public  string ServiceId { get; set; } = string.Empty;
        public DateTime AppointmentDate { get; set; }  
        public  string SalonName { get; set; } = string.Empty;
        public double Amount { get; set; }
    }
}