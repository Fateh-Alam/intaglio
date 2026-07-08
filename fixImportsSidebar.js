const fs = require('fs');

const imports = `import Image from "next/image";
import { TUTORIAL_CONTENT } from "../../utils/tutorialContent";
import { FORMAT } from "../../lib/brand";
import HistoryPanel from "../../components/HistoryPanel";
import CurveEditor from "../../components/CurveEditor";
import ColorWheel from "../../components/ColorWheel";
import { FILM_EMULATIONS } from "../../lib/filmEmulations";
import CinematicTextControls from "../../components/CinematicTextControls";
import TutorialModal from "../../components/TutorialModal";
import PresetCreatorModal from "../../components/PresetCreatorModal";
import ReferenceViewer from "../../components/ReferenceViewer";
import LUTCreatorModal from "../../components/LUTCreatorModal";
import * as THREE from "three";
import VideoGradingPanel from "../../components/VideoGradingPanel";

import React from 'react';
import { COLOR_LABELS, WATERMARK_POSITIONS, DEFAULT_ASSET_METADATA, DEFAULT_WATERMARK, getImageFileInfo, EXPORT_RECIPES } from "../pageTypes";
import { getEditorModuleLabel } from '../pageTypes';
import { TutorialTrigger } from '../../components/TutorialModal';
import { useEditorState } from '../hooks/useEditorState';
import { IconUpload, IconMovie, IconPhoto, IconEye, IconDeviceFloppy, IconDownload, IconAdjustmentsHorizontal, IconHistory, IconLayersIntersect, IconInfoCircle, IconX, IconCircle, IconChartLine, IconTypography, IconArrowsMaximize, IconSparkles, IconCamera, IconRotateClockwise, IconZoomIn, IconSun, IconContrast, IconPalette, IconAperture, IconBolt, IconBulb, IconMapPin, IconDeviceDesktop, IconPerspective, IconDroplet, IconChevronRight, IconFileCode, IconCircles, IconMoon, IconCircleFilled, IconChevronLeft } from "@tabler/icons-react";
import Slider from "../../components/Slider";
import ControlGroup from "../../components/ControlGroup";
`;

let content = fs.readFileSync('app/editor/components/EditorRightSidebar.tsx', 'utf-8');
fs.writeFileSync('app/editor/components/EditorRightSidebar.tsx', imports + '\n' + content);

console.log('Restored imports');
