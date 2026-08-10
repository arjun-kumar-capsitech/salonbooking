namespace SalonBackend.Models.Dtos
{
    public class RegisterEmployeeRequest
    {
        public string StaffId { get; set; } = string.Empty;
        public string Email { get; internal set; } = string.Empty;
        public string FullName { get; internal set; } = string.Empty;
        public string Password { get; internal set; } = string.Empty;
    }
}