import { NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongoDB/mongoDB";
import { guid } from "@/lib/Utils";
import { ObjectId } from "mongodb";
import sanitizeHtml from "sanitize-html";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      jobTitle,
      description,
      questions,
      lastEditedBy,
      createdBy,
      screeningSetting,
      orgID,
      requireVideo,
      location,
      workSetup,
      workSetupRemarks,
      status,
      salaryNegotiable,
      minimumSalary,
      maximumSalary,
      country,
      province,
      employmentType,
      screeningQuestions,
      interviewScreening,
    } = body;

    // --- ✅ Validate required fields ---
    if (!jobTitle || !description || !questions || !location || !workSetup) {
      return NextResponse.json(
        {
          error:
            "Job title, description, questions, location and work setup are required",
        },
        { status: 400 }
      );
    }

    // --- ✅ Validate orgID format ---
    if (!orgID || !ObjectId.isValid(orgID)) {
      return NextResponse.json(
        { error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    // --- 🧼 Sanitize fields ---
    const cleanJobTitle = sanitizeHtml(jobTitle, { allowedTags: [], allowedAttributes: {} });
    const cleanDescription = sanitizeHtml(description, {
      allowedTags: ["b", "i", "em", "strong", "p", "ul", "ol", "li", "br", "a"],
      allowedAttributes: { a: ["href", "target"] },
      allowedSchemes: ["http", "https", "mailto"],
    });
    const cleanLocation = sanitizeHtml(location, { allowedTags: [], allowedAttributes: {} });
    const cleanWorkSetup = sanitizeHtml(workSetup, { allowedTags: [], allowedAttributes: {} });
    const cleanWorkSetupRemarks = sanitizeHtml(workSetupRemarks || "", {
      allowedTags: [],
      allowedAttributes: {},
    });

    // --- 🧼 Deep sanitize nested `questions` array ---
    const cleanQuestions = Array.isArray(questions)
      ? questions.map((cat) => ({
          ...cat,
          category: sanitizeHtml(cat.category || "", {
            allowedTags: [],
            allowedAttributes: {},
          }),
          questions: Array.isArray(cat.questions)
            ? cat.questions.map((q) => ({
                ...q,
                question: sanitizeHtml(q.question || "", {
                  allowedTags: [],
                  allowedAttributes: {},
                }),
              }))
            : [],
        }))
      : [];

    const { db } = await connectMongoDB();

    // --- Fetch org + plan ---
    const orgDetails = await db
      .collection("organizations")
      .aggregate([
        { $match: { _id: new ObjectId(orgID) } },
        {
          $lookup: {
            from: "organization-plans",
            let: { planId: "$planId" },
            pipeline: [
              { $addFields: { _id: { $toString: "$_id" } } },
              { $match: { $expr: { $eq: ["$_id", "$$planId"] } } },
            ],
            as: "plan",
          },
        },
        { $unwind: { path: "$plan", preserveNullAndEmptyArrays: true } },
      ])
      .toArray();

    if (!orgDetails || orgDetails.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // --- Plan limit check ---
    const totalActiveCareers = await db
      .collection("careers")
      .countDocuments({ orgID, status: "active" });

    const jobLimit =
      (orgDetails[0].plan?.jobLimit || 3) + (orgDetails[0].extraJobSlots || 0);

    if (totalActiveCareers >= jobLimit) {
      return NextResponse.json(
        { error: "You have reached the maximum number of jobs for your plan" },
        { status: 400 }
      );
    }

    // --- Insert sanitized data ---
    const career = {
      id: guid(),
      jobTitle: cleanJobTitle,
      description: cleanDescription,
      questions: cleanQuestions,
      location: cleanLocation,
      workSetup: cleanWorkSetup,
      workSetupRemarks: cleanWorkSetupRemarks,
      createdAt: new Date(),
      updatedAt: Date.now(),
      lastEditedBy,
      createdBy,
      status: status || "active",
      screeningSetting,
      orgID,
      requireVideo,
      lastActivityAt: new Date(),
      salaryNegotiable,
      minimumSalary,
      maximumSalary,
      country,
      province,
      employmentType,
      screeningQuestions,
      interviewScreening,
    };

    await db.collection("careers").insertOne(career);

    return NextResponse.json({
      message: "Career added successfully",
      career,
    });
  } catch (error) {
    console.error("Error adding career:", error);
    return NextResponse.json(
      { error: "Failed to add career" },
      { status: 500 }
    );
  }
}
