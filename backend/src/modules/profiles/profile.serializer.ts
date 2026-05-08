type ProfileRow = Record<string, unknown> & {
  viewer_is_owner?: boolean;
  viewer_is_admin?: boolean;
  email_visibility?: 'PUBLIC' | 'PRIVATE';
  phone_visibility?: 'PUBLIC' | 'PRIVATE';
  dob_visibility?: 'PUBLIC' | 'PRIVATE';
  email?: string;
  phone_number?: string | null;
  date_of_birth?: string | null;
};

export function serializeProfile(row: ProfileRow) {
  const privileged = Boolean(row.viewer_is_owner || row.viewer_is_admin);
  return {
    userId: row.user_id,
    fullName: row.full_name,
    email: privileged || row.email_visibility === 'PUBLIC' ? row.email : undefined,
    phoneNumber: privileged || row.phone_visibility === 'PUBLIC' ? row.phone_number : undefined,
    dateOfBirth: privileged || row.dob_visibility === 'PUBLIC' ? row.date_of_birth : undefined,
    role: privileged ? row.role : undefined,
    status: privileged ? row.status : undefined,
    bio: row.bio,
    education: {
      primarySchool: row.primary_school,
      primarySchoolStartYear: row.primary_school_start_year,
      primarySchoolEndYear: row.primary_school_end_year,
      primarySchoolCurrent: row.primary_school_current,
      highSchool: row.high_school,
      highSchoolStartYear: row.high_school_start_year,
      highSchoolEndYear: row.high_school_end_year,
      highSchoolCurrent: row.high_school_current,
      university: row.university,
      universityStartYear: row.university_start_year,
      universityEndYear: row.university_end_year,
      universityCurrent: row.university_current
    },
    professional: {
      currentJob: row.current_job,
      currentWorkplace: row.current_workplace,
      pastJobs: row.past_jobs,
      workExperience: row.work_experience
    },
    media: {
      profilePictureUrl: row.profile_picture_url,
      images: row.images ?? []
    },
    privacy: privileged ? {
      emailVisibility: row.email_visibility,
      phoneVisibility: row.phone_visibility,
      dobVisibility: row.dob_visibility
    } : undefined
  };
}
