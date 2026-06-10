import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node"],
  outputFileTracingIncludes: {
    "/api/chat": [
      "./data/**",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/config.json",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/tokenizer.json",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/tokenizer_config.json",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/onnx/model.onnx",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime_providers_shared.so",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node",
    ],
    "/api/plan": [
      "./data/**",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/config.json",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/tokenizer.json",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/tokenizer_config.json",
      "./node_modules/@huggingface/transformers/.cache/Xenova/all-MiniLM-L6-v2/onnx/model.onnx",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime.so.1",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/libonnxruntime_providers_shared.so",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/onnxruntime_binding.node",
    ],
    "/s/[token]/opengraph-image": ["./src/assets/fraunces-600.ttf"],
  },
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/onnxruntime-node/bin/napi-v6/**/libonnxruntime_providers_cuda.so",
      "./node_modules/onnxruntime-node/bin/napi-v6/**/libonnxruntime_providers_tensorrt.so",
      "./node_modules/onnxruntime-node/bin/napi-v6/darwin/**",
      "./node_modules/onnxruntime-node/bin/napi-v6/win32/**",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/arm64/**",
      "./node_modules/@huggingface/transformers/.cache/**/model_quantized.onnx",
    ],
  },
};

export default nextConfig;
