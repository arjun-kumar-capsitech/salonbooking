using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace SalonBackend.Models
{
    public class Booking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;
        public string CustomerId { get; set; } = string.Empty;
        public string StaffId { get; set; } = string.Empty;
        public List<string> ServiceIds { get; set; } = new(); 

        public string ServiceId { get; set; } = string.Empty;
        public string SalonName { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public DateTime AppointmentDate { get; set; }
        public double Amount { get; set; }
        public string Status { get; set; } = "pending";

        public string StartTime { get; set; } = string.Empty;

        public string EndTime { get; set; } = string.Empty;
    }
}