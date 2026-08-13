using System;

namespace SalonBackend.Models.Dtos
{
    public class BookingDto
    {
        public string StaffId { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string ServiceId { get; set; } = string.Empty;
        public List<string> ServiceIds { get; set; } = new();
        public DateTime AppointmentDate { get; set; }
        public string SalonName { get; set; } = string.Empty;
        public double Amount { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
    }
}