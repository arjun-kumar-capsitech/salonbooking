namespace SalonBackend.Models.Dtos
{
  public class TimeDto 
  {
        public string Day { get; set; } = string.Empty;
        public string Opening { get; set; } = string.Empty;
        public string Closing { get; set; } = string.Empty;
        public bool IsOpen { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
  }

}

