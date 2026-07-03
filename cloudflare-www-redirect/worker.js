export default {
  async fetch(request) {
    const incoming = new URL(request.url);
    const target = new URL(request.url);
    target.hostname = "opensourcebarware.com";
    target.protocol = "https:";
    return Response.redirect(target.toString(), 301);
  },
};
