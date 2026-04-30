import { App, requestUrl } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NormalPublishExecutionContext } from "../src/core/normalPublish/types";
import { PublishableNote } from "../src/core/note";
import { MetaWeblogProvider } from "../src/providers/metaWeblogProvider";
import { MetaWeblogTargetConfig } from "../src/types";

function createApp(): App {
  return {} as App;
}

function createNote(): PublishableNote {
  return {
    filePath: "Notes/Post.md",
    title: "Post",
    markdown: "Hello **MetaWeblog**",
    frontmatter: {},
    attachments: [],
    unresolvedAttachments: [],
    excerpt: "Excerpt",
    slug: "post",
    tags: ["Obsidian"],
    categories: ["Notes"],
  };
}

function createTarget(provider: MetaWeblogTargetConfig["provider"] = "metaweblog"): MetaWeblogTargetConfig {
  return {
    id: `${provider}-target`,
    name: provider,
    enabled: true,
    provider,
    endpoint: "https://blog.example/xmlrpc.php",
    username: "demo",
    appPassword: "secret",
    blogId: "blog-1",
    defaultStatus: "draft",
    contentFormat: "html",
  };
}

function successResponse(value: string): { status: number; text: string } {
  return {
    status: 200,
    text: `<?xml version="1.0"?><methodResponse><params><param><value><string>${value}</string></value></param></params></methodResponse>`,
  };
}

describe("MetaWeblogProvider", () => {
  beforeEach(() => {
    vi.mocked(requestUrl).mockReset();
    vi.stubGlobal("document", {
      createElement: () => ({
        innerHTML: "",
        querySelectorAll: () => [],
      }),
    });
  });

  it("publishes a new XML-RPC post with detailed-mode metadata", async () => {
    vi.mocked(requestUrl).mockResolvedValue(successResponse("42") as never);
    const provider = new MetaWeblogProvider(createApp(), "metaweblog");
    const context: NormalPublishExecutionContext = {
      common: { title: "Custom title" },
      provider: {
        provider: "wordpress",
        slug: "custom-title",
        excerpt: "Custom excerpt",
        tags: ["xmlrpc"],
        categories: ["Publishing"],
        status: "publish",
        password: "",
      },
    };

    const result = await provider.publish(createNote(), createTarget(), context);

    expect(result).toEqual({ remoteId: "42", remoteUrl: "https://blog.example/?p=42" });
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "https://blog.example/xmlrpc.php",
        headers: { "Content-Type": "text/xml" },
        body: expect.stringContaining("<methodName>metaWeblog.newPost</methodName>"),
      })
    );
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("Custom title") }));
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("custom-title") }));
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("Publishing") }));
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("xmlrpc") }));
  });

  it("updates an existing XML-RPC post and keeps the remote id stable", async () => {
    vi.mocked(requestUrl).mockResolvedValue(successResponse("1") as never);
    const provider = new MetaWeblogProvider(createApp(), "cnblogs");

    const result = await provider.update("remote-7", createNote(), createTarget("cnblogs"));

    expect(result.remoteId).toBe("remote-7");
    expect(requestUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining("<methodName>metaWeblog.editPost</methodName>"),
      })
    );
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("remote-7") }));
  });

  it("validates config with blogger.getUsersBlogs and surfaces XML-RPC faults", async () => {
    vi.mocked(requestUrl).mockResolvedValue({
      status: 200,
      text: "<?xml version=\"1.0\"?><methodResponse><fault><value><struct><member><name>faultString</name><value><string>bad login</string></value></member></struct></value></fault></methodResponse>",
    } as never);
    const provider = new MetaWeblogProvider(createApp(), "typecho");

    await expect(provider.validateConfig(createTarget("typecho"))).rejects.toThrow("bad login");
    expect(requestUrl).toHaveBeenCalledWith(expect.objectContaining({ body: expect.stringContaining("blogger.getUsersBlogs") }));
  });
});
