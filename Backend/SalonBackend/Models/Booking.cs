using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace SalonBackend.Models
{
    public class Booking
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        public string CustomerId { get; set; }
        public string StaffId { get; set; }
        public string ServiceId { get; set; }
        public string SalonName { get; set; }
        public DateTime AppointmentDate { get; set; }
        public double Amount { get; set; }
        public string Status { get; set; } = "pending";
    }
}