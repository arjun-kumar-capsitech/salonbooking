namespace SalonBackend.Models.Dtos
{
    public class TimeDto
    {
        public DateTime? Date { get; set; }
        public string Day { get; set; } = string.Empty;
        public string Opening { get; set; } = string.Empty;

        public string Closing { get; set; } = string.Empty;

        public bool IsOpen { get; set; }

        public string UserId { get; set; } = string.Empty;

        public string SalonName { get; set; } = string.Empty;

    }
}