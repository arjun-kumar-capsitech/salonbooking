namespace SalonBackend.Models.Dtos
{
    public class StaffDto
    {
        public string Name { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime JoinedDate { get; set; }
        public string SalonName { get; set; } = string.Empty;
        public string? PhoneNumber { get; internal set; }
    }
}
