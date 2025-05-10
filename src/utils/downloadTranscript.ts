/**
 * Downloads the chat transcript as a text file by calling the /api/transcript endpoint.
 * @param {Array<object>} messages - The array of chat messages to include in the transcript.
 * @returns {Promise<void>} Resolves when the download is triggered.
 * @throws {Error} If the transcript fetch fails.
 */
export async function downloadTranscript(messages: any[]) {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const friendlyTime = now.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short" // Include timezone abbreviation
  });
  const response = await fetch("/api/transcript", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, exportedAt: friendlyTime }),
  });
  if (!response.ok) throw new Error("Failed to fetch transcript");
  const filename = `Gandalf Chat Transcript ${datetime}.txt`;
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}
