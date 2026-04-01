using System;

namespace SalonBackend.Models.Dtos
{
    public class BookingDto
    {
        public string StaffId { get; set; }
        public string ServiceId { get; set; }
        public DateTime AppointmentDate { get; set; }
        public string SalonName { get; set; }
        public double Amount { get; set; }
    }
}