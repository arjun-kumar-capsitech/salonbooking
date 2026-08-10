namespace SalonBackend.Models.Dtos
{
    public class SlotRequestDto
    {
        public string UserId { get; set; } = string.Empty;
        public string StaffId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public List<string> ServiceIds { get; set; } = new();
    }

    public class SlotDto
    {
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
    }

    public class SlotResponseDto
    {
        public bool Status { get; set; }
        public string Message { get; set; } = string.Empty;
        public List<SlotDto> Slots { get; set; } = new();
    }
}