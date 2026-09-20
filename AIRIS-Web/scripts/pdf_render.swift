import Foundation
import PDFKit
import CoreGraphics
import UniformTypeIdentifiers

guard CommandLine.arguments.count >= 3 else {
    print("Usage: swift pdf_render.swift <input.pdf> <output_prefix>")
    exit(1)
}

let pdfPath = CommandLine.arguments[1]
let outputPrefix = CommandLine.arguments[2]

let fileManager = FileManager.default
let currentDir = fileManager.currentDirectoryPath
let resolvedPath = pdfPath.hasPrefix("/") ? pdfPath : "\(currentDir)/\(pdfPath)"
let resolvedURL = URL(fileURLWithPath: resolvedPath)

guard let document = PDFDocument(url: resolvedURL) else {
    print("Failed to open PDF at \(resolvedPath)")
    exit(1)
}

let pageCount = document.pageCount
print("Total pages: \(pageCount)")

for i in 0..<pageCount {
    guard let page = document.page(at: i) else { continue }
    let pageRect = page.bounds(for: .mediaBox)
    let scale: CGFloat = 2.0 // High-DPI 2x scale
    let width = Int(pageRect.width * scale)
    let height = Int(pageRect.height * scale)
    
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(data: nil,
                                  width: width,
                                  height: height,
                                  bitsPerComponent: 8,
                                  bytesPerRow: 0,
                                  space: colorSpace,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else {
        continue
    }
    
    context.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    
    context.saveGState()
    context.scaleBy(x: scale, y: scale)
    page.draw(with: .mediaBox, to: context)
    context.restoreGState()
    
    guard let image = context.makeImage() else { continue }
    let outPath = "\(outputPrefix)_\(i + 1).png"
    let resolvedOut = outPath.hasPrefix("/") ? outPath : "\(currentDir)/\(outPath)"
    let outUrl = URL(fileURLWithPath: resolvedOut)
    
    guard let destination = CGImageDestinationCreateWithURL(outUrl as CFURL, UTType.png.identifier as CFString, 1, nil) else {
        continue
    }
    CGImageDestinationAddImage(destination, image, nil)
    if CGImageDestinationFinalize(destination) {
        print("Rendered page \(i + 1) to \(outUrl.path)")
    }
}
