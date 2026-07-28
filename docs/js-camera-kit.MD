API Reference
YMK.init(args)
Configures module appearance, detection mode, language, and capture format.

Argument	Type	Description	Default
faceDetectionMode	string	Detection flow to use (see Detection Modes below).	"skincare"
width	number	Pixel width of module container (300–1920).	360 (≥500px) or screen width
height	number	Pixel height of module container (300–1920).	480 (≥500px) or min(screen.height, innerHeight)
language	string	UI Language code (chs, cht, deu, enu, esp, fra, jpn, kor, ptb, ita).	"enu"
imageFormat	string	Format returned via faceDetectionCaptured.	"base64"
disableCameraResolutionCheck	boolean	Allow running even if webcam does not meet required resolution.	false
hideFlipCameraButton	boolean	Controls visibility of the flip front/back camera button if the device supports it.	false
countingDuration	number	Controls the countdown milliseconds when camera quality check meets criteria before auto-capture.	800
qualityLevel	string	Controls the camera quality check setting, with options of relaxed, moderate, or strict.	relaxed
qualityOverrides	object	Configure detailed parameters for camera quality verification.	See Camera Kit Quality Configuration
videoQuality	string	Configure the output quality to 720p, 1080p, or 1920p. 720p corresponds to 1280 × 720, 1080p to 1920 × 1080, and 1920p to 2560 × 1920. This setting is supported only for skincare and hdskincare	720p
Methods
Method	Description
YMK.openCameraKit()	Opens the module and begins detection.
YMK.close()	Closes module and camera.
YMK.addEventListener(event, callback)	Registers event callbacks. Returns an EventListenerIdentifier.
YMK.removeEventListener(id)	Removes listener by identifier.
YMK.isLoaded()	Returns whether livestream or photo is drawn on canvas (boolean).
YMK.pause()	Pauses the webcam stream.
YMK.resume(restartWebcam)	Resumes webcam after pause.
YMK.getInfo()	Returns current module info (e.g., { fps: 30 }).
Camera Kit Quality Configuration
Camera Kit provides configurable quality parameters to control face detection and skin analysis behavior. These parameters allow developers to fine-tune detection strictness while maintaining consistency across web and native SDK implementations.

To simplify configuration, Camera Kit includes three predefined presets:

RELAXED: Optimized for usability with minimal restrictions
MODERATE: Balanced between usability and accuracy
STRICT: Optimized for maximum detection accuracy
All custom configurations must meet or exceed the minimum requirements defined by the RELAXED preset.

Camera Kit Quality Configuration supports both skincare and hdskincare.

Preset Behavior
Preset	Description
RELAXED	Less strict validation for smoother user experience
MODERATE	Balanced validation for most use cases
STRICT	Tight validation for high accuracy scenarios
When using qualityOverrides, you may specify only the parameters you want to change. Unspecified parameters fall back to the active preset defaults.

Configuration Object


{
  "face_ratio_lower_threshold": 0.55,
  "face_ratio_upper_threshold": 1,
  "face_left_boundary_lower_threshold": 0,
  "face_left_boundary_upper_threshold": 1,
  "face_right_boundary_lower_threshold": 0,
  "face_right_boundary_upper_threshold": 1,
  "face_top_boundary_lower_threshold": 0,
  "face_top_boundary_upper_threshold": 1,
  "face_bottom_boundary_lower_threshold": 0,
  "face_bottom_boundary_upper_threshold": 1,
  "pitch_lower_threshold": -20,
  "pitch_upper_threshold": 10,
  "yaw_lower_threshold": -15,
  "yaw_upper_threshold": 15,
  "roll_lower_threshold": -15,
  "roll_upper_threshold": 15,
  "lighting_lower_threshold": 0.55,
  "lighting_upper_threshold": 0.8,
  "lighting_uneven_threshold": 0.2
}
Parameters
Face Ratio Control
Controls the acceptable proportion of the detected face.

Measurement basis:
Landscape mode: vertical ratio
Portrait mode: horizontal ratio
Parameter	Description	Allowed Range	Preset Defaults
face_ratio_lower_threshold	Minimum face ratio	0.55 to 1.0	STRICT 0.75, MODERATE 0.65, RELAXED 0.55
face_ratio_upper_threshold	Maximum face ratio	1.0	1.0 (all presets)
Face Boundary Control
Defines how close the face can be to the frame edges.

Parameter	Description	Allowed Range	Default
face_left_boundary_lower_threshold	Left boundary minimum	0.0 to 1.0	0.0
face_left_boundary_upper_threshold	Left boundary maximum	0.0 to 1.0	1.0
face_right_boundary_lower_threshold	Right boundary minimum	0.0 to 1.0	0.0
face_right_boundary_upper_threshold	Right boundary maximum	0.0 to 1.0	1.0
face_top_boundary_lower_threshold	Top boundary minimum	0.0 to 1.0	0.0
face_top_boundary_upper_threshold	Top boundary maximum	0.0 to 1.0	1.0
face_bottom_boundary_lower_threshold	Bottom boundary minimum	0.0 to 1.0	0.0
face_bottom_boundary_upper_threshold	Bottom boundary maximum	0.0 to 1.0	1.0
Head Pose Angle Control
Controls allowable head orientation.

Parameter	Description	Allowed Range	Preset Defaults
pitch_lower_threshold	Minimum pitch angle	-20 to 10	STRICT -10, MODERATE -15, RELAXED -20
pitch_upper_threshold	Maximum pitch angle	-20 to 10	STRICT 0, MODERATE 5, RELAXED 10
yaw_lower_threshold	Minimum yaw angle	-15 to 15	STRICT -5, MODERATE -10, RELAXED -15
yaw_upper_threshold	Maximum yaw angle	-15 to 15	STRICT 5, MODERATE 10, RELAXED 15
roll_lower_threshold	Minimum roll angle	-15 to 15	STRICT -5, MODERATE -10, RELAXED -15
roll_upper_threshold	Maximum roll angle	-15 to 15	STRICT 5, MODERATE 10, RELAXED 15
Lighting Control
Defines acceptable lighting quality and uniformity.

Parameter	Description	Allowed Range	Preset Defaults
lighting_lower_threshold	Minimum lighting level	0.55 to 1.0	STRICT 0.8, MODERATE 0.7, RELAXED 0.55
lighting_upper_threshold	Maximum lighting level	0.8 to 1.0	STRICT 0.9, MODERATE 0.85, RELAXED 0.8
lighting_uneven_threshold	Maximum luma difference between eyes	0.0 to 0.2	STRICT 0.1, MODERATE 0.15, RELAXED 0.2
Validation Rules
Custom values must not be less restrictive than RELAXED preset values.
Only specified fields in qualityOverrides are applied.
All unspecified parameters default to the selected preset.
Detection Modes
Configure the faceDetectionMode in YMK.init() to suit your specific use case.

Mode	Description
makeup	Standard camera mode for virtual cosmetic try-on.
skincare	Standard skin analysis mode, close-up face capture. Support AI Skin Analysis and AI Skin Simulation.
hdskincare	High-definition capture for AI skin analysis using webcams with a minimum resolution of 2560 pixels on the longer side, subject to device support.
shadefinder	Skin Tone Analysis front-face capture.
facereshape	AI Face Reshape capture and AI Face Lift.
hairlength	Full hair-length capture (from a distance).
hairfrizziness	3-phase capture: front, right-turn, left-turn.
hairtype	Same 3-phase multi-angle capture flow.
hairdensity	A 45‑degree downward head‑angle photograph.
ring	Hand capture for ring virtual try‑on.
wrist	Wrist capture for watch or bracelet virtual try‑on.
necklace	Selfie capture for necklace try-on.
earring	Selfie capture for earring virtual try-on.
teethwhiten	Front‑facing selfie that detects whether teeth are visible; photo taken only when detected.
nail	Hand capture for nails virtual try‑on.
comprehensive	Photo to be used simultaneously for AI Makeup, AI Skin Analysis, and AI Facial Attributes & Ratio Analysis.
Events Reference
Lifecycle & Status Events
Event	Description
opened	Module opened.
loading	Loading progress (0–100).
loaded	Camera stream loaded onto canvas.
closed	Module closed.
faceDetectionStarted	User enters the detection UI.
Camera Events
Event	Description
cameraOpened	Webcam opened successfully.
cameraClosed	Webcam closed.
cameraFailed	Permission denied or no webcam found. Error codes include "error_resolution_unsupported", "error_permission_denied", "error_access_failed".
unsupportedResolution	Fired when the device resolution does not meet the minimum requirements for the selected mode.
Detection Events
faceQualityChanged
Fires continuously during detection as quality metrics update.

Example Payload:



{
  "hasFace": true,
  "position": "good",
  "frontal": "good",
  "lighting": "ok"
}
Field Definitions:

hasFace: (boolean) Whether a face is detected.
position: (string) Face distance/size quality ("good", "notgood", "toosmall", "outofboundary").
frontal: (string) Whether user is facing forward ("good", "notgood").
lighting: (string) Lighting strength ("good", "ok", "notgood").
faceDetectionCaptured
Fired after all required face quality validation checks have passed and the Camera Kit has successfully completed the capture workflow. Depending on the mode, this may contain one or multiple images.

Example Payload:



{
  "mode": "makeup",
  "images": [
    {
      "phase": 0,
      "image": "data:image/jpeg;base64,...",
      "width": 500,
      "height": 500
    }
  ]
}
Image Object Fields:

phase: (integer) Zero-based index representing the capture step.
image: (string | Blob) The captured image data.
width: (integer) Pixel width of the captured image.
height: (integer) Pixel height of the captured image.
Configuration Notes
Quality Requirements
To ensure successful capture:

Distance: Ensure correct face distance (not too zoomed in/out).
Angle: Ensure frontal face angle.
Lighting: Provide sufficient lighting (avoid shadows or dark environments).
Multi-Phase Capture
Modes like hairtype or hairfrizziness require multiple steps:

Front face
Turn right
Turn left
Ensure your event handling logic accounts for multiple images in the faceDetectionCaptured result array.

Advanced Configuration
Flip Button: Use hideFlipCameraButton: true to enforce a specific camera orientation if your UX requires it.
Capture Delay: Adjust countingDuration (default 800) to give users more time to review the capture before auto-submission occurs.
Minimum Recommended Quality


const minQuality = {
  hasFace: true,
  area: "good",
  frontal: "good",
  lighting: "ok"
};