namespace SalonBackend.Models.Dtos
{
    public class AdminServiceDto
    {
        public string ServiceName { get; set; } = string.Empty;
        public int Duration { get; set; }
        public decimal Price { get; set; }
        public bool IsActive { get; set; } = true;
        public string SalonName { get; set; } = string.Empty;

    }
}