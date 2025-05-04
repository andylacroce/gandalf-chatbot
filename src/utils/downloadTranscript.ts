// Utility to download transcript using fetch/Blob and client-side filename generation
export async function downloadTranscript(messages: any[]) {
  console.log('[downloadTranscript] Sending messages:', messages);
  const response = await fetch('/api/transcript', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  console.log('[downloadTranscript] Response status:', response.status);
  if (!response.ok) throw new Error('Failed to fetch transcript');

  // Generate filename on the client-side
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const filename = `Gandalf Chat Transcript ${datetime}.txt`;
  console.log('[downloadTranscript] Generated filename:', filename);

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename; // Set the download attribute directly
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    a.remove();
    console.log('[downloadTranscript] Download triggered and cleaned up.');
  }, 100);
}
