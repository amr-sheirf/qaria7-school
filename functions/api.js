const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxyhZq7fIlmJi31wtvotNgPS2dUsVEyUN9C3z2vPpYGXhQEtgOAk_DzXh21Qc68V_qF1w/exec";

export async function onRequestPost(context) {
  try {
    const body = await context.request.text();
    const target = context.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json;charset=UTF-8" },
      body
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.ok ? 200 : 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({status:"error",message:"تعذر الاتصال بخدمة البيانات"}), {
      status: 502,
      headers: {"Content-Type":"application/json; charset=utf-8"}
    });
  }
}

export async function onRequestGet() {
  return new Response(JSON.stringify({status:"ok",service:"Qaria7 School API Proxy"}), {
    headers: {"Content-Type":"application/json; charset=utf-8"}
  });
}
