namespace SalonBackend.Models.Dtos
{
    public class PasswordDto
    {
        public string? Email { get; set; }

        public string? Token { get; set; }

        public string? CurrentPassword { get; set; }

        public string? NewPassword { get; set; }

        public string? ConfirmPassword { get; set; }
    }
}