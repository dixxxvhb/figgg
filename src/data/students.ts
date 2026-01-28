import { Student } from '../types';

export const students: Student[] = [
  // CAA STUDENTS
  {
    id: 'student-1',
    name: 'Landry Cerasoli',
    nickname: 'Landry',
    parentName: 'Shannon Hoefen',
    parentEmail: 'shannon.hoefen@gmail.com',
    parentPhone: '585-943-3570',
    birthdate: '2016-01-01', // Age 9
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1950', 'class-caa-tue-1650', 'class-caa-tue-1750'], // Contemporary 1, Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-2',
    name: 'Yessa Culp',
    nickname: 'Yessa',
    parentName: 'Jess',
    parentEmail: 'justjess82@hotmail.com',
    parentPhone: '267-259-2626',
    birthdate: '2011-01-01', // Age 14
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-wed-1950', 'class-caa-tue-1850'], // Jazz 2/3, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-3',
    name: 'Lauren Ebinger',
    nickname: 'Lauren',
    parentName: '',
    parentEmail: 'sja06@yahoo.com',
    parentPhone: '567-227-0318',
    birthdate: '2009-01-01', // Age 16
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-wed-1950', 'class-caa-tue-1850'], // Jazz 2/3, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-4',
    name: 'Lucy Foth',
    nickname: 'Lucy',
    parentName: 'Lauren Greiter',
    parentEmail: 'Lauren.greiter@gmail.com',
    parentPhone: '914-804-3580',
    birthdate: '2015-01-01', // Age 10
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-5',
    name: 'Ava Grace Gerrity',
    nickname: 'Ava Grace',
    parentName: 'Christina Gerrity',
    parentEmail: 'Christinagerrity@me.com',
    parentPhone: '856-577-1047',
    birthdate: '2013-01-01', // Age 12
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1550', 'class-caa-wed-1950'], // Jazz 1, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-6',
    name: 'Liam Gerrity',
    nickname: 'Liam',
    parentName: 'Christina Gerrity',
    parentEmail: 'christinagerrity@me.com',
    parentPhone: '856-577-1047',
    birthdate: '2010-01-01', // Age 15
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-tue-1850'], // Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-7',
    name: 'Mila Noor Harnage',
    nickname: 'Mila',
    parentName: 'Emilia Soliman',
    parentEmail: 'emiliasoliman08@gmail.com',
    parentPhone: '407-414-0688',
    birthdate: '2016-01-01', // Age 9
    notes: '',
    skillNotes: [],
    classIds: [], // Competition only - not in regular CAA classes
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-8',
    name: 'Evangeline Jurawan',
    nickname: 'Evangeline',
    parentName: 'J Jurawan',
    parentEmail: 'jjurawan@gmail.com',
    parentPhone: '407-508-9919',
    birthdate: '2013-01-01', // Age 12
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1845', 'class-caa-tue-1550'], // Contemporary 2, Jazz 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-9',
    name: 'Audrey Mattheis',
    nickname: 'Audrey',
    parentName: 'Mattheis Family',
    parentEmail: 'Mattheisfam@gmail.com',
    parentPhone: '253-653-9021',
    birthdate: '2015-01-01', // Age 10
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-10',
    name: 'Haylie Mattheis',
    nickname: 'Haylie',
    parentName: 'Mattheis Family',
    parentEmail: 'Mattheisfam@gmail.com',
    parentPhone: '253-653-9021',
    birthdate: '2016-01-01', // Age 9
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-11',
    name: 'Ellie Mertz',
    nickname: 'Ellie',
    parentName: 'A Mertz',
    parentEmail: 'amertz21@gmail.com',
    parentPhone: '407-383-8826',
    birthdate: '2011-01-01', // Age 14
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1845', 'class-caa-tue-1950', 'class-caa-tue-1850'], // Contemporary 2, Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-12',
    name: 'Zoe Mertz',
    nickname: 'Zoe',
    parentName: 'A Mertz',
    parentEmail: 'amertz21@gmail.com',
    parentPhone: '407-383-8826',
    birthdate: '2009-01-01', // Age 16
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1845', 'class-caa-tue-1950', 'class-caa-tue-1850'], // Contemporary 2, Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-13',
    name: 'Leila Morina',
    nickname: 'Leila',
    parentName: 'A Martyniak',
    parentEmail: 'AMARTYNIAK29@GMAIL.COM',
    parentPhone: '407-752-4781',
    birthdate: '2012-01-01', // Age 13
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1845', 'class-caa-tue-1950', 'class-caa-tue-1850'], // Contemporary 2, Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-14',
    name: 'John Nuzzi',
    nickname: 'John',
    parentName: 'Maria Nuzzi',
    parentEmail: 'marialnuzzi@gmail.com',
    parentPhone: '252-373-1908',
    birthdate: '2009-01-01', // Age 16
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1845', 'class-caa-tue-1950', 'class-caa-tue-1850'], // Contemporary 2, Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-15',
    name: 'Madeline Pennington-Woodward',
    nickname: 'Madeline',
    parentName: 'Chelsea Woodward',
    parentEmail: 'chelseawoodward@aol.com',
    parentPhone: '407-690-9174',
    birthdate: '2016-01-01', // Age 9
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-16',
    name: 'Athena Raymundo',
    nickname: 'Athena',
    parentName: 'Raymundo Family',
    parentEmail: 'raymundo.dance@gmail.com',
    parentPhone: '407-922-4455',
    birthdate: '2019-01-01', // Age 6
    notes: '',
    skillNotes: [],
    classIds: [], // Competition only - not in regular CAA classes
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-17',
    name: 'Laylianna Raymundo',
    nickname: 'Laylianna',
    parentName: 'Raymundo Family',
    parentEmail: 'raymundo.dance@gmail.com',
    parentPhone: '407-922-4455',
    birthdate: '2015-01-01', // Age 10
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1550', 'class-caa-wed-1950'], // Jazz 1, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-18',
    name: 'Remi Russell',
    nickname: 'Remi',
    parentName: 'Aleaha Russell',
    parentEmail: 'Aleaharussell@gmail.com',
    parentPhone: '651-353-0978',
    birthdate: '2013-01-01', // Age 12
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1550', 'class-caa-wed-1950', 'class-caa-tue-1850'], // Jazz 1, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-19',
    name: 'Adelyn Smith',
    nickname: 'Adelyn',
    parentName: 'Katrina Smith',
    parentEmail: 'katrinaannesmith@yahoo.com',
    parentPhone: '407-575-0688',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1550', 'class-caa-wed-1950'], // Jazz 1, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-20',
    name: 'Blossom Smith',
    nickname: 'Blossom',
    parentName: 'L Smith',
    parentEmail: 'Lsmith159@sky.com',
    parentPhone: '407-608-2130',
    birthdate: '2017-01-01', // Age 8
    notes: '',
    skillNotes: [],
    classIds: [], // Competition only - not in regular CAA classes
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-21',
    name: 'Daisy Smith',
    nickname: 'Daisy',
    parentName: 'L Smith',
    parentEmail: 'Lsmith159@sky.com',
    parentPhone: '407-209-8921',
    birthdate: '2009-01-01', // Age 16
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1845', 'class-caa-tue-1950', 'class-caa-tue-1850'], // Contemporary 2, Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-22',
    name: 'Grayson Spinner',
    nickname: 'Grayson',
    parentName: 'John Spinner',
    parentEmail: 'John@victoryimpact.io',
    parentPhone: '518-651-4436',
    birthdate: '2016-01-01', // Age 9
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-23',
    name: 'Penelope Wood',
    nickname: 'Penelope',
    parentName: 'P Taghdiri',
    parentEmail: 'ptaghdiri@gmail.com',
    parentPhone: '949-678-9614',
    birthdate: '2017-01-01', // Age 8
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },

  // NEW STUDENTS FROM CAA CLASS ROSTERS (not on competition team)
  {
    id: 'student-24',
    name: 'Clara Baez',
    nickname: 'Clara',
    parentName: 'Carol Vega',
    parentEmail: 'Carolvega_14@hotmail.com',
    parentPhone: '786-838-6339',
    birthdate: '2011-01-01', // Age 14
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-tue-1850'], // Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-25',
    name: 'Lexa Constantinou',
    nickname: 'Lexa',
    parentName: 'Erica Ervin',
    parentEmail: 'Ericaervinpa@yahoo.com',
    parentPhone: '610-656-7389',
    birthdate: '2010-01-01', // Age 15
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-wed-1950', 'class-caa-tue-1850'], // Jazz 2/3, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-26',
    name: 'Griffin McConnell',
    nickname: 'Griffin',
    parentName: 'GK McConnell',
    parentEmail: 'gkmcconnell@mac.com',
    parentPhone: '321-303-2118',
    birthdate: '2012-01-01', // Age 13
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-wed-1950', 'class-caa-tue-1850'], // Jazz 2/3, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-27',
    name: 'Sydney Smallwood',
    nickname: 'Sydney',
    parentName: 'EW Smallwood',
    parentEmail: 'ewsmallwood@gmail.com',
    parentPhone: '713-894-3339',
    birthdate: '2012-01-01', // Age 13
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-tue-1850'], // Jazz 2/3
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-28',
    name: 'Ava Van Zetten',
    nickname: 'Ava V',
    parentName: 'Amy Van Zetten',
    parentEmail: 'amyvanzetten@gmail.com',
    parentPhone: '941-993-7204',
    birthdate: '2011-01-01', // Age 14
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1950', 'class-caa-wed-1950', 'class-caa-tue-1850'], // Jazz 2/3, Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-29',
    name: 'Ella Bowersox',
    nickname: 'Ella',
    parentName: 'Ches Bowersox',
    parentEmail: 'Chesbowersox@yahoo.com',
    parentPhone: '407-446-8257',
    birthdate: '2016-01-01', // Age 9
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1950'], // Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-30',
    name: 'Kadence Soloman',
    nickname: 'Kadence',
    parentName: 'ER Blake',
    parentEmail: 'erblake1989@gmail.com',
    parentPhone: '386-965-5937',
    birthdate: '2012-01-01', // Age 13
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-wed-1950', 'class-caa-tue-1750'], // Contemporary 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-31',
    name: 'Caitlyn Johnson',
    nickname: 'Caitlyn',
    parentName: 'SMF Johnson',
    parentEmail: 'smfjohnson@yahoo.com',
    parentPhone: '201-694-8640',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1550'], // Jazz 1
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-32',
    name: 'Aubrey Anderson',
    nickname: 'Aubrey A',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2015-01-01', // Age 10
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-33',
    name: 'Kaela Lawrence',
    nickname: 'Kaela',
    parentName: 'Kymone Brown',
    parentEmail: 'brownkymone@gmail.com',
    parentPhone: '754-272-4339',
    birthdate: '2009-01-01', // Age 16
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-34',
    name: 'Alessia Lugon',
    nickname: 'Alessia',
    parentName: 'Camila Ballon Landa',
    parentEmail: 'camila.ballonlanda@gmail.com',
    parentPhone: '321-389-2699',
    birthdate: '2017-01-01', // Age 8
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-35',
    name: 'Sofia Lugon',
    nickname: 'Sofia',
    parentName: 'Camila Ballon Landa',
    parentEmail: 'camila.ballonlanda@gmail.com',
    parentPhone: '321-389-2699',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650', 'class-caa-tue-1750'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-36',
    name: 'Nevaeh Wise Beaumont',
    nickname: 'Nevaeh',
    parentName: 'Gem Wise',
    parentEmail: 'Gemzwise@gmail.com',
    parentPhone: '321-332-5656',
    birthdate: '2013-01-01', // Age 12
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1650'], // Ballet 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-37',
    name: 'Danella Benitez',
    nickname: 'Danella',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1750'], // Jazz 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-38',
    name: 'Amelia Bracco',
    nickname: 'Amelia',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2015-01-01', // Age 10
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1750'], // Jazz 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-39',
    name: 'Emma Fischetti',
    nickname: 'Emma F',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2015-01-01', // Age 10
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1750'], // Jazz 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-40',
    name: 'Lola Matos',
    nickname: 'Lola',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1750'], // Jazz 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-41',
    name: 'Olivia Mesaros',
    nickname: 'Olivia',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1750'], // Jazz 10+
    createdAt: new Date().toISOString(),
  },
  {
    id: 'student-42',
    name: 'Martina Sosa',
    nickname: 'Martina',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    birthdate: '2014-01-01', // Age 11
    notes: '',
    skillNotes: [],
    classIds: ['class-caa-tue-1750'], // Jazz 10+
    createdAt: new Date().toISOString(),
  },
];

// Helper to get student by ID
export const getStudentById = (id: string): Student | undefined => {
  return students.find(s => s.id === id);
};
