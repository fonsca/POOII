namespace PrimeiraChamadaMed.Api.Validation;

/// <summary>Expressões regulares usadas nos DTOs.</summary>
public static class Patterns
{
    public const string Phone = @"^\(\d{2}\) \d{4,5}-\d{4}$";
    public const string Time = @"^([01]\d|2[0-3]):[0-5]\d$";
    public const string HexColor = @"^#[0-9a-fA-F]{6}$";
    public const string ImageDataUrl = @"^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$";
}