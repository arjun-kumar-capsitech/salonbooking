namespace SalonBackend.Models.Dtos
{
    public class UpdateUserRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string SalonName { get; set; } = string.Empty;     
        public string SalonAddress { get; set; } = string.Empty;   
        public int Role { get; set; }
        public bool IsActive { get; set; }
    }
}