const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs/promises");
const path = require("path");

const HELPER_TAG_BEGIN = "# @musicpromo-ffmpeg-bitcode-strip-begin";
const HELPER_TAG_END = "# @musicpromo-ffmpeg-bitcode-strip-end";
const CALL_TAG = "strip_bitcode_from_ffmpeg_frameworks(installer)";
const CALL_LINE = `    ${CALL_TAG}`;

const HELPER_SNIPPET = `${HELPER_TAG_BEGIN}
# Strip bitcode from ffmpeg frameworks because App Store Connect rejects
# embedded binaries that still contain bitcode.
def strip_bitcode_from_ffmpeg_frameworks(installer)
  bitcode_strip = \`xcrun --find bitcode_strip\`.strip
  unless File.exist?(bitcode_strip)
    Pod::UI.warn "bitcode_strip not found. Skipping FFmpeg bitcode strip."
    return
  end

  framework_binaries = %w[
    ffmpegkit
    libavcodec
    libavdevice
    libavfilter
    libavformat
    libavutil
    libswresample
    libswscale
  ]

  Dir.glob(File.join(installer.sandbox.root.to_s, "**", "*.framework")).each do |framework_path|
    framework_name = File.basename(framework_path, ".framework")
    next unless framework_binaries.include?(framework_name)

    binary_path = File.join(framework_path, framework_name)
    next unless File.exist?(binary_path)

    Pod::UI.puts "Stripping bitcode from #{binary_path}"
    success = system(bitcode_strip, binary_path, "-r", "-o", binary_path)
    unless success
      Pod::UI.warn "Failed to strip bitcode from #{binary_path}"
    end
  end
end
${HELPER_TAG_END}
`;

function addHelperIfMissing(contents) {
  if (contents.includes(HELPER_TAG_BEGIN)) {
    return contents;
  }

  const anchor = "  post_install do |installer|";
  const index = contents.indexOf(anchor);
  if (index === -1) {
    throw new Error("Could not find post_install block in Podfile.");
  }

  return `${contents.slice(0, index)}${HELPER_SNIPPET}\n${contents.slice(index)}`;
}

function addCallIfMissing(contents) {
  if (contents.includes(CALL_LINE)) {
    return contents;
  }

  const reactNativePostInstallRegex = /react_native_post_install\([\s\S]*?\n\s*\)/;
  const match = contents.match(reactNativePostInstallRegex);
  if (!match) {
    throw new Error("Could not locate react_native_post_install call in Podfile.");
  }

  return contents.replace(
    reactNativePostInstallRegex,
    `${match[0]}\n${CALL_LINE}`
  );
}

module.exports = function withFfmpegBitcodeStrip(config) {
  return withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(modConfig.modRequest.platformProjectRoot, "Podfile");
      let contents = await fs.readFile(podfilePath, "utf8");
      contents = addHelperIfMissing(contents);
      contents = addCallIfMissing(contents);
      await fs.writeFile(podfilePath, contents);
      return modConfig;
    },
  ]);
};
