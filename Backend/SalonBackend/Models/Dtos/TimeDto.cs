namespace SalonBackend.Models.Dtos
{
    public class TimeDto
    {
        public string Day { get; set; } = "";

        public string Opening { get; set; } = "";

        public string Closing { get; set; } = "";

        public bool IsOpen { get; set; }
    }
}