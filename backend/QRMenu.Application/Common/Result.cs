namespace QRMenu.Application.Common;

public class Result
{
    public bool IsSuccess { get; private set; }
    public string ErrorMessage { get; private set; } = string.Empty;
    public List<string> Errors { get; private set; } = new();

    protected Result(bool isSuccess, string errorMessage = "")
    {
        IsSuccess = isSuccess;
        ErrorMessage = errorMessage;
    }

    public static Result Success() => new(true);
    public static Result Failure(string error) => new(false, error);
    public static Result Failure(List<string> errors) 
    {
        var result = new Result(false);
        result.Errors.AddRange(errors);
        return result;
    }

    public static implicit operator Result(string error) => Failure(error);
}

public class Result<T> : Result
{
    public T? Data { get; private set; }

    private Result(bool isSuccess, T? data = default, string errorMessage = "") 
        : base(isSuccess, errorMessage)
    {
        Data = data;
    }

    public static Result<T> Success(T data) => new(true, data);
    public static new Result<T> Failure(string error) => new(false, default, error);
    public static new Result<T> Failure(List<string> errors) 
    {
        var result = new Result<T>(false);
        result.Errors.AddRange(errors);
        return result;
    }

    public static implicit operator Result<T>(T data) => Success(data);
    public static implicit operator Result<T>(string error) => Failure(error);
} 