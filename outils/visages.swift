import Foundation
import Vision
import ImageIO
import CoreGraphics

// Pour chaque image : taille après redressement EXIF, et la boîte du plus
// grand visage, en coordonnées normalisées origine en haut à gauche.
for chemin in CommandLine.arguments.dropFirst() {
    let url = URL(fileURLWithPath: chemin)
    guard let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
        print("{\"path\":\"\(chemin)\",\"err\":\"lecture\"}")
        continue
    }
    let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any]
    let brut = (props?[kCGImagePropertyOrientation] as? UInt32) ?? 1
    let orientation = CGImagePropertyOrientation(rawValue: brut) ?? .up

    // Une photo prise à la verticale a ses dimensions inversées dans le
    // fichier : c'est l'orientation EXIF qui les remet d'aplomb.
    let pivote = brut >= 5 && brut <= 8
    let largeur = pivote ? cg.height : cg.width
    let hauteur = pivote ? cg.width : cg.height

    let requete = VNDetectFaceRectanglesRequest()
    let handler = VNImageRequestHandler(cgImage: cg, orientation: orientation, options: [:])
    try? handler.perform([requete])

    var type = "visage"
    var boite: CGRect? = (requete.results ?? [])
        .max(by: { $0.boundingBox.height < $1.boundingBox.height })?.boundingBox

    // Casque intégral, vue de dos, personne allongée au loin : pas de visage,
    // mais un corps. Sa boîte suffit à savoir vers où cadrer.
    if boite == nil {
        let corps = VNDetectHumanRectanglesRequest()
        try? handler.perform([corps])
        if let c = (corps.results ?? []).max(by: { $0.boundingBox.height < $1.boundingBox.height }) {
            boite = c.boundingBox
            type = "corps"
        }
    }

    guard let b = boite else {
        print("{\"path\":\"\(chemin)\",\"w\":\(largeur),\"h\":\(hauteur),\"kind\":\"rien\"}")
        continue
    }
    // Vision compte depuis le bas, les images depuis le haut.
    let y = 1 - (b.origin.y + b.height)
    print(String(format:
        "{\"path\":\"%@\",\"w\":%d,\"h\":%d,\"kind\":\"%@\",\"x\":%.4f,\"y\":%.4f,\"fw\":%.4f,\"fh\":%.4f}",
        chemin, largeur, hauteur, type, b.origin.x, y, b.width, b.height))
}
