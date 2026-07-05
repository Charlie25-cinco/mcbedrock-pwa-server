export async function callLocalApi(
  endpoint: string,
  method: string,
  tunnelUrl: string,
  authToken: string
) {
  const url = `${tunnelUrl.replace(/\/$/, '')}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  return response.json();
}
