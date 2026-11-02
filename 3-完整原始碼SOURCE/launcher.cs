using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Diagnostics;

class Program
{
    static HttpListener listener;
    static string distPath;

    static void Main(string[] args)
    {
        // 取得程式所在目錄
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        distPath = Path.Combine(exeDir, "dist");

        if (!Directory.Exists(distPath))
        {
            distPath = exeDir; // 若 dist 檔案就在 exe 同目錄
        }

        if (!File.Exists(Path.Combine(distPath, "index.html")))
        {
            Console.WriteLine("[錯誤] 找不到 index.html！請確保 dist 資料夾或靜態網頁檔案與此程式放在同目錄。");
            Console.ReadKey();
            return;
        }

        // 自動尋找可用連接埠
        int port = 18888;
        for (int p = 18888; p < 19999; p++)
        {
            try
            {
                listener = new HttpListener();
                listener.Prefixes.Add("http://127.0.0.1:" + p + "/");
                listener.Start();
                port = p;
                break;
            }
            catch
            {
                listener.Close();
            }
        }

        Thread serverThread = new Thread(StartServer);
        serverThread.IsBackground = true;
        serverThread.Start();

        string url = "http://127.0.0.1:" + port + "/";

        // 尋找 Edge 瀏覽器並以 --app 獨立視窗模式啟動（無網址列、無分頁標籤，宛如原生應用程式）
        string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
        if (!File.Exists(edgePath))
        {
            edgePath = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
        }

        Process appProcess = null;
        if (File.Exists(edgePath))
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = edgePath;
            psi.Arguments = "--app=" + url + " --window-size=1366,850";
            psi.UseShellExecute = false;
            appProcess = Process.Start(psi);
        }
        else
        {
            // 若無 Edge 則用系統預設瀏覽器開啟
            Process.Start(url);
        }

        // 若啟動了獨立視窗，監聽其退出
        if (appProcess != null)
        {
            appProcess.WaitForExit();
        }
        else
        {
            // 常駐背景直至手動終止
            Thread.Sleep(Timeout.Infinite);
        }
    }

    static void StartServer()
    {
        while (listener.IsListening)
        {
            try
            {
                var context = listener.GetContext();
                ThreadPool.QueueUserWorkItem((c) => HandleRequest((HttpListenerContext)c), context);
            }
            catch { }
        }
    }

    static void HandleRequest(HttpListenerContext context)
    {
        try
        {
            string rawUrl = context.Request.Url.AbsolutePath;
            if (rawUrl == "/" || string.IsNullOrEmpty(rawUrl)) rawUrl = "/index.html";
            rawUrl = rawUrl.TrimStart('/');

            string filePath = Path.Combine(distPath, rawUrl.Replace('/', Path.DirectorySeparatorChar));

            if (File.Exists(filePath))
            {
                byte[] bytes = File.ReadAllBytes(filePath);
                string ext = Path.GetExtension(filePath).ToLower();
                string contentType = "application/octet-stream";

                if (ext == ".html") contentType = "text/html; charset=utf-8";
                else if (ext == ".js" || ext == ".mjs") contentType = "application/javascript; charset=utf-8";
                else if (ext == ".css") contentType = "text/css; charset=utf-8";
                else if (ext == ".json") contentType = "application/json; charset=utf-8";
                else if (ext == ".svg") contentType = "image/svg+xml";
                else if (ext == ".png") contentType = "image/png";
                else if (ext == ".jpg" || ext == ".jpeg") contentType = "image/jpeg";
                else if (ext == ".ico") contentType = "image/x-icon";
                else if (ext == ".woff") contentType = "font/woff";
                else if (ext == ".woff2") contentType = "font/woff2";

                context.Response.ContentType = contentType;
                context.Response.ContentLength64 = bytes.Length;
                context.Response.OutputStream.Write(bytes, 0, bytes.Length);
            }
            else
            {
                context.Response.StatusCode = 404;
            }
        }
        catch { }
        finally
        {
            try { context.Response.OutputStream.Close(); } catch { }
        }
    }
}
