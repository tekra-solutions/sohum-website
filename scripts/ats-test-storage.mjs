/** In-memory private Storage stand-in for local browser verification only. */
import { createServer } from "node:http";
const objects = new Map();
const server = createServer(async (request, response) => {
  if (request.headers.apikey !== "local-test-key") { response.writeHead(403).end(); return; }
  const pathname = decodeURIComponent(new URL(request.url,"http://localhost").pathname);
  const key = pathname.replace(/^\/storage\/v1\/object\/(authenticated\/)?/, "");
  if (request.method === "POST" && pathname.startsWith("/storage/v1/object/")) {
    const chunks=[]; for await (const chunk of request) chunks.push(chunk);
    objects.set(key,Buffer.concat(chunks)); response.writeHead(200,{"Content-Type":"application/json"}).end(JSON.stringify({Key:key}));
  } else if (request.method === "GET" && objects.has(key)) response.writeHead(200,{"Content-Type":"application/pdf"}).end(objects.get(key));
  else response.writeHead(404,{"Content-Type":"application/json"}).end('{"message":"Not found"}');
});
server.listen(3108,"127.0.0.1",()=>console.log("Local test-only storage listening on 3108"));
