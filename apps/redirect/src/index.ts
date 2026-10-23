type Env = { TARGET_ORIGIN: string };

/** 301 from the old workers.dev URL to the new domain, so existing prompts and links keep working. */
export default {
  fetch(request: Request, env: Env) {
    const { pathname, search } = new URL(request.url);
    return Response.redirect(`${env.TARGET_ORIGIN}${pathname}${search}`, 301);
  },
};
