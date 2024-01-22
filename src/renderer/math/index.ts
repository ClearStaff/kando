//////////////////////////////////////////////////////////////////////////////////////////
//   _  _ ____ _  _ ___  ____                                                           //
//   |_/  |__| |\ | |  \ |  |    This file belongs to Kando, the cross-platform         //
//   | \_ |  | | \| |__/ |__|    pie menu. Read more on github.com/kando-menu/kando     //
//                                                                                      //
//////////////////////////////////////////////////////////////////////////////////////////

// SPDX-FileCopyrightText: Simon Schneegans <code@simonschneegans.de>
// SPDX-License-Identifier: MIT

import { IVec2 } from '../../common';

/** This method converts radians to degrees. */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** This method converts degrees to radians. */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** This method returns the length of the given vector. */
export function getLength(vec: IVec2): number {
  return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

/** This method returns the distance between the two given vectors. */
export function getDistance(vec1: IVec2, vec2: IVec2): number {
  return getLength({ x: vec1.x - vec2.x, y: vec1.y - vec2.y });
}

/** This adds two IVec2 together. */
export function add(vec1: IVec2, vec2: IVec2): IVec2 {
  return { x: vec1.x + vec2.x, y: vec1.y + vec2.y };
}

/** This subtracts vec2 from vec1. */
export function subtract(vec1: IVec2, vec2: IVec2): IVec2 {
  return { x: vec1.x - vec2.x, y: vec1.y - vec2.y };
}

/**
 * This method returns the angle of the given vector in degrees. 0° is on the top, 90° is
 * on the right, 180° is on the bottom and 270° is on the right. The vector does not need
 * to be normalized.
 */
export function getAngle(vec: IVec2): number {
  const angle = (toDegrees(Math.atan2(vec.y, vec.x)) + 90) % 360;
  if (angle < 0) {
    return 360 + angle;
  }

  return angle;
}

/**
 * This method returns the direction vector for the given angle and length. 0° is on the
 * top, 90° is on the right, 180° is on the bottom and 270° is on the right.
 */
export function getDirection(angle: number, length: number): IVec2 {
  const radians = toRadians(angle - 90);
  return {
    x: Math.cos(radians) * length,
    y: Math.sin(radians) * length,
  };
}

/**
 * This method receives an array of objects, each representing an item in a menu level.
 * For each item it computes an angle defining the direction in which the item should be
 * rendered. The angles are returned in an array (of the same length as the input array).
 * If an item in the input array already has an 'angle' property, this is considered a
 * fixed angle and all others are distributed more ore less evenly around. This method
 * also reserves the required angular space for the back navigation link to the parent
 * item (if given). Angles in items are always in degrees, 0° is on the top, 90° on the
 * right, 180° on the bottom and so on. Fixed input angles must be monotonically
 * increasing. If this is not the case, the smaller angle is ignored.
 *
 * @param items The Items for which the angles should be computed. They may already have
 *   an angle property. If so, this is considered a fixed angle.
 * @param parentAngle The angle of the parent item. If given, there will be some reserved
 *   space.
 * @returns An array of angles in degrees.
 */
export function computeItemAngles(
  items: { angle?: number }[],
  parentAngle?: number
): number[] {
  const itemAngles: number[] = [];

  // Shouldn't happen, but who knows...
  if (items.length == 0) {
    return itemAngles;
  }

  // We begin by storing all fixed angles.
  const fixedAngles: { angle: number; index: number }[] = [];
  items.forEach((item, index) => {
    if ('angle' in item && item.angle >= 0) {
      fixedAngles.push({ angle: item.angle, index: index });
    }
  });

  // Make sure that the parent link does not collide with a fixed item. For now, we
  // just move the fixed angle a tiny bit. This is somewhat error-prone as it may
  // collide with another fixed angle now. Maybe this could be solved in a better way?
  // Maybe some global minimum angular spacing of items?
  if (parentAngle != undefined) {
    for (let i = 0; i < fixedAngles.length; i++) {
      if (Math.abs(fixedAngles[i].angle - parentAngle) < 0.0001) {
        fixedAngles[i].angle += 0.1;
      }
    }
  }

  // Make sure that the fixed angles are between 0° and 360°.
  for (let i = 0; i < fixedAngles.length; i++) {
    fixedAngles[i].angle = fixedAngles[i].angle % 360;
  }

  // Make sure that the fixed angles increase monotonically. If a fixed angle is larger
  // than the next one, the next one will be ignored.
  for (let i = 0; i < fixedAngles.length - 1; ) {
    if (fixedAngles[i].angle > fixedAngles[i + 1].angle) {
      fixedAngles.splice(i + 1, 1);
    } else {
      ++i;
    }
  }

  // If no item has a fixed angle, we assign one to the first item. If there is no
  // parent item, this is on the top (0°). Else, the angular space will be evenly
  // distributed to all child items and the first item will be the one closest to the
  // top.
  if (fixedAngles.length == 0) {
    let firstAngle = 0;
    if (parentAngle != undefined) {
      const wedgeSize = 360 / (items.length + 1);
      let minAngleDiff = 360;
      for (let i = 0; i < items.length; i++) {
        const angle = (parentAngle + (i + 1) * wedgeSize) % 360;
        const angleDiff = Math.min(angle, 360 - angle);

        if (angleDiff < minAngleDiff) {
          minAngleDiff = angleDiff;
          firstAngle = (angle + 360) % 360;
        }
      }
    }
    fixedAngles.push({ angle: firstAngle, index: 0 });
    itemAngles[0] = firstAngle;
  }

  // Now we iterate through the fixed angles, always considering wedges between
  // consecutive pairs of fixed angles. If there is only one fixed angle, there is also
  // only one 360°-wedge.
  for (let i = 0; i < fixedAngles.length; i++) {
    const wedgeBeginIndex = fixedAngles[i].index;
    const wedgeBeginAngle = fixedAngles[i].angle;
    const wedgeEndIndex = fixedAngles[(i + 1) % fixedAngles.length].index;
    let wedgeEndAngle = fixedAngles[(i + 1) % fixedAngles.length].angle;

    // The fixed angle can be stored in our output.
    itemAngles[wedgeBeginIndex] = wedgeBeginAngle;

    // Make sure we loop around.
    if (wedgeEndAngle <= wedgeBeginAngle) {
      wedgeEndAngle += 360;
    }

    // Calculate the number of items between the begin and end indices.
    let wedgeItemCount =
      (wedgeEndIndex - wedgeBeginIndex - 1 + items.length) % items.length;

    // We have one item more if the parent link is inside our wedge.
    let parentInWedge = false;

    if (parentAngle != undefined) {
      // It can be that the parent link is inside the current wedge, but it's angle is
      // one full turn off.
      if (parentAngle < wedgeBeginAngle) {
        parentAngle += 360;
      }

      parentInWedge = parentAngle > wedgeBeginAngle && parentAngle < wedgeEndAngle;
      if (parentInWedge) {
        wedgeItemCount += 1;
      }
    }

    // Calculate the angular difference between consecutive items in the current wedge.
    const wedgeItemGap = (wedgeEndAngle - wedgeBeginAngle) / (wedgeItemCount + 1);

    // Now we assign an angle to each item between the begin and end indices.
    let index = (wedgeBeginIndex + 1) % items.length;
    let count = 1;
    let parentGapRequired = parentInWedge;

    while (index != wedgeEndIndex) {
      let itemAngle = wedgeBeginAngle + wedgeItemGap * count;

      // Insert gap for parent link if required.
      if (parentGapRequired && itemAngle + wedgeItemGap / 2 - parentAngle > 0) {
        count += 1;
        itemAngle = wedgeBeginAngle + wedgeItemGap * count;
        parentGapRequired = false;
      }

      itemAngles[index] = itemAngle % 360;

      index = (index + 1) % items.length;
      count += 1;
    }
  }

  return itemAngles;
}

/**
 * This variant of the computeItemAngles method is used during drag-and-drop operations in
 * the menu editor. It behaves similar to the computeItemAngles method, but it allows to
 * pass additional information. This is required to compute the angles correctly during
 * drag-and-drop operations.
 *
 * First, you can pass the index of the item which is currently dragged around. This item
 * will then receive the same angle as its successor and all other angles will be computed
 * as if the dragged item was not there.
 *
 * Furthermore, it is possible to pass the index of the location where something is about
 * to be dropped. If this is given, the angles will leave an gap for the to-be-dropped
 * item.
 *
 * @param items The Items for which the angles should be computed. They may already have
 *   an angle property. If so, this is considered a fixed angle.
 * @param parentAngle The angle of the parent item. If given, there will be some reserved
 *   space.
 * @param dragIndex The index of the item which is currently dragged around. If given, the
 *   angles will be computed as if the dragged item was not there.
 * @param dropIndex The index of the location where something is about to be dropped. If
 *   given, the angles will leave an additional gap for the dropped item.
 * @returns An array of angles in degrees and the angle for the to-be-dropped item (if
 *   given).
 */
export function computeItemAnglesDnD(
  items: { angle?: number }[],
  parentAngle?: number,
  dropIndex?: number
): { itemAngles: number[]; dropAngle?: number } {
  // Create a copy of the items array.
  const itemsCopy = items.slice();

  // Add an additional artificial item if something is about to be dropped.
  if (dropIndex != null) {
    itemsCopy.splice(dropIndex, 0, {});
  }

  // Now compute the angles as usual.
  const itemAngles = computeItemAngles(itemsCopy, parentAngle);

  // We will also return the angle for the to-be-dropped item (if given).
  let dropAngle = null;

  // If we added an artificial item to leave an angular gap for the to-be-dropped item, we
  // have to remove this again from the list of item angles as there is no real item at
  // this position. We only wanted to affect the angles for the adjacent items.
  if (dropIndex != null) {
    dropAngle = itemAngles.splice(dropIndex, 1)[0];
  }

  return { itemAngles, dropAngle };
}

/**
 * Computes the start and end angles of the wedges for the given items. The parent angle
 * is optional. If it is given, there will be a gap towards the parent node.
 *
 * For now, this method performs some expensive computations like sorting lists and
 * searching for indices. This could be optimized in the future. I guess that there is a
 * more analytical solution to this problem. However, for now this is good enough as it
 * performs pretty well even for thousands of nodes.
 *
 * @param itemAngles A list of angles for each item. The angles are in degrees and between
 *   0° and 360°.
 * @param parentAngle The angle of the parent node. If given, there will be a gap towards
 *   the parent node. This should be in degrees and between 0° and 360°.
 * @returns A list of start and end angles for each item. Each item in the list
 *   corresponds to the item at the same index in the `itemAngles` list. The start angle
 *   will always be smaller than the end angle. Consequently, the start angle can be
 *   negative and the end angle can be larger than 360°.
 */
export function computeItemWedges(
  itemAngles: number[],
  parentAngle?: number
): { start: number; end: number }[] {
  // If the node has no children, we can stop here.
  if (itemAngles.length === 0) {
    return [];
  }

  // If the node as a single child but no parent (e.g. it's the root node), we can
  // simply set the angle of the child to 0 and the start and end angles to a full
  // circle.
  if (itemAngles.length === 1 && isNaN(parentAngle)) {
    return [
      {
        start: 0,
        end: 360,
      },
    ];
  }

  // Now we have to compute the separators between the children. We do this by sorting
  // the angles and computing the middle between each pair of angles. We also have to
  // add the angle towards the parent node if the node has a parent.
  const allAngles = itemAngles.slice();
  if (!isNaN(parentAngle)) {
    allAngles.push(parentAngle);
  }
  allAngles.sort((a, b) => a - b);

  const separators = [];
  for (let i = 0; i < allAngles.length; ++i) {
    if (i === allAngles.length - 1) {
      separators.push((allAngles[i] + allAngles[0] + 360) / 2);
    } else {
      separators.push((allAngles[i] + allAngles[i + 1]) / 2);
    }
  }

  // Now we search for the separators before and after each child and assign the
  // corresponding angles to the child.
  const items = [];
  for (let i = 0; i < itemAngles.length; ++i) {
    const wedgeIndex = separators.findIndex((s) => s > itemAngles[i]);

    items.push({
      start:
        wedgeIndex == 0
          ? separators[separators.length - 1] - 360
          : separators[wedgeIndex - 1],
      end: separators[wedgeIndex],
    });
  }

  return items;
}

/**
 * This method returns true if the given angle is between the given start and end angles.
 * The angles are in degrees and start should be smaller than end. The method also works
 * if the angle and the start and end angles are negative or larger than 360°.
 *
 * @param angle The angle to check.
 * @param start The start angle.
 * @param end The end angle.
 */
export function isAngleBetween(angle: number, start: number, end: number): boolean {
  return (
    (angle > start && angle <= end) ||
    (angle - 360 > start && angle - 360 <= end) ||
    (angle + 360 > start && angle + 360 <= end)
  );
}

export function computeDropIndex(itemAngles: number[], dragAngle: number): number {
  // We compute the drop index by comparing the dragAngle with the itemAngles. There are a
  // few special cases when there are only a few items in the menu.
  if (itemAngles.length === 0) {
    // If there is no current item, it's easy: We simply drop at index zero.
    return 0;
  } else if (itemAngles.length === 1) {
    // If there is one current item, we have to decide whether to drop before / or after.
    return dragAngle - itemAngles[0] < 90 || dragAngle - itemAngles[0] > 270 ? 0 : 1;
  } else {
    // All other cases can be handled with a loop through the drop zone wedges between the
    // items. For each wedge, we decide whether the pointer is inside the wedge.
    for (let i = 0; i < itemAngles.length; i++) {
      const wedgeStart = itemAngles[(i + itemAngles.length - 1) % itemAngles.length];
      let wedgeCenter = itemAngles[i];
      let wedgeEnd = itemAngles[(i + 1) % itemAngles.length];

      // Wrap around.
      if (wedgeCenter < wedgeStart) {
        wedgeCenter += 360;
      }

      if (wedgeEnd < wedgeCenter) {
        wedgeEnd += 360;
      }

      const dropZoneStart = wedgeCenter - (wedgeCenter - wedgeStart) * 0.5;
      const dropZoneEnd = wedgeCenter + (wedgeEnd - wedgeCenter) * 0.5;

      if (isAngleBetween(dragAngle, dropZoneStart, dropZoneEnd)) {
        return i;
      }
    }
  }
}
