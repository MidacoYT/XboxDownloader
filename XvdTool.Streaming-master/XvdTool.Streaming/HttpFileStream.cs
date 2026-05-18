using System.Diagnostics;
using System.Net.Http.Headers;

namespace XvdTool.Streaming;

public sealed class HttpFileStream : Stream
{
    public string Url { get; }

    private readonly HttpClient _httpClient = new();
    private long _contentLength = -1;

    private HttpFileStream(string url)
    {
        Url = url;
    }

    public static HttpFileStream Open(string url)
    {
        var stream = new HttpFileStream(url);
        stream.GetFileLength();
        return stream;
    }

    private void GetFileLength()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, Url);
        request.Headers.Range = new RangeHeaderValue(0, 0);
        var response = _httpClient.Send(request);
        response.EnsureSuccessStatusCode();
        var contentRange = response.Content.Headers.ContentRange;
        if (contentRange == null || contentRange.Unit == "none")
            throw new InvalidOperationException("URL does not support 'Range:' header.");
        if (contentRange.Unit != "bytes")
            throw new InvalidOperationException($"URL supports 'Range:' header but uses invalid unit {contentRange.Unit}.");
        if (!contentRange.HasLength)
            throw new InvalidOperationException("URL supports 'Range:' header but did not respond with content length.");
        _contentLength = contentRange.Length!.Value;
    }

    private byte[] ReadRange(long position, int count)
    {
        var actualLength = Math.Min(position + count, _contentLength);
        if (position >= actualLength)
            return [];
        var request = new HttpRequestMessage(HttpMethod.Get, Url);
        request.Headers.Range = new RangeHeaderValue(position, actualLength - 1);
        var response = _httpClient.Send(request);
        response.EnsureSuccessStatusCode();
        using var stream = response.Content.ReadAsStream();
        var buffer = new byte[actualLength - position];
        var offset = 0;
        while (offset < buffer.Length)
        {
            var read = stream.Read(buffer, offset, buffer.Length - offset);
            if (read <= 0) break;
            offset += read;
        }
        return buffer;
    }

    public override int Read(byte[] buffer, int offset, int count)
    {
        var data = ReadRange(Position, count);
        if (data.Length == 0) return 0;
        data.CopyTo(buffer, offset);
        Position += data.Length;
        return data.Length;
    }

    public override int Read(Span<byte> buffer)
    {
        var data = ReadRange(Position, buffer.Length);
        if (data.Length == 0) return 0;
        data.AsSpan().CopyTo(buffer);
        Position += data.Length;
        return data.Length;
    }

    public override async Task<int> ReadAsync(byte[] buffer, int offset, int count, CancellationToken cancellationToken)
    {
        var data = await Task.Run(() => ReadRange(Position, count), cancellationToken);
        if (data.Length == 0) return 0;
        data.CopyTo(buffer, offset);
        Position += data.Length;
        return data.Length;
    }

    public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
    {
        var data = await Task.Run(() => ReadRange(Position, buffer.Length), cancellationToken);
        if (data.Length == 0) return 0;
        data.AsSpan().CopyTo(buffer.Span);
        Position += data.Length;
        return data.Length;
    }

    public override long Seek(long offset, SeekOrigin origin)
    {
        var newPosition = origin switch
        {
            SeekOrigin.Begin => offset,
            SeekOrigin.Current => Position + offset,
            SeekOrigin.End => _contentLength - offset,
            _ => throw new UnreachableException()
        };
        if (newPosition >= _contentLength)
            throw new IOException("Cannot seek past file end");
        Position = newPosition;
        return Position;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing) _httpClient.Dispose();
        base.Dispose(disposing);
    }

    public override bool CanRead => true;
    public override bool CanSeek => true;
    public override bool CanWrite => false;
    public override long Length => _contentLength;
    public override long Position { get; set; }

    #region Unimplemented Methods
    public override void SetLength(long value) => throw new NotImplementedException();
    public override void Flush() => throw new NotImplementedException();
    public override void Write(byte[] buffer, int offset, int count) => throw new NotImplementedException();
    #endregion
}
